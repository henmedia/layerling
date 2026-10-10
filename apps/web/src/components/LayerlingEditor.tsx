"use client";

import { GuideHelpLink } from "@/components/GuideHelpLink";
import { AlertTriangle, Check, Percent, Circle as CircleIcon, CloudUpload, Download, Eye, EyeOff, FilePlus2, FolderOpen, Hexagon as HexagonIcon, Info, ListTree, Pencil, Search, Square as SquareIcon, Triangle as TriangleIcon, X } from "lucide-react";
import { ObjectListPanel } from "@/components/workplane/ObjectListPanel";
import type manifoldModule from "manifold-3d";
import type { ManifoldToplevel } from "manifold-3d";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ADDITION, Brush, Evaluator, HOLLOW_INTERSECTION, HOLLOW_SUBTRACTION, INTERSECTION, SUBTRACTION, type CSGOperation } from "three-bvh-csg";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { AppThemePreference, ResolvedAppTheme } from "@/lib/appTheme";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { getLanguage, t, type MessageKey } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import { sphereTessellation } from "@/lib/sphereTessellation";
import { createGearGeometry } from "@/lib/gearGeometry";
import { createStarGeometry } from "@/lib/starGeometry";
import { createHeartGeometry } from "@/lib/heartGeometry";
import { createCrescentGeometry } from "@/lib/crescentGeometry";
import { createSlotGeometry } from "@/lib/slotGeometry";
import { createDovetailGeometry } from "@/lib/dovetailGeometry";
import { createLoftGeometry, loftMeasures, loftShapePatch, type LoftMeasures } from "@/lib/loftGeometry";
import { createHingeGeometry } from "@/lib/hingeGeometry";
import { createKnurlGeometry } from "@/lib/knurlGeometry";
import { hingeWorldParts } from "@/lib/hingeParts";
import { createTeardropGeometry } from "@/lib/teardropGeometry";
import { createScrewHoleGeometry } from "@/lib/screwHoleGeometry";
import { decodeClipboardPayload, encodeClipboardPayload, LOCAL_CLIPBOARD_LIMIT, newestClipboard, type ClipboardPayload } from "@/lib/clipboardPayload";
import { createHoneycombGeometry } from "@/lib/honeycombGeometry";
import { createRoundedBoxGeometry } from "@/lib/roundedBoxGeometry";
import { bentTubeNaturalDimensions, createBentTubeGeometry, normalizedBentTubeFields } from "@/lib/bentTubeGeometry";
import { createPrismGeometry } from "@/lib/prismGeometry";
import { createBooleanHalfSphereGeometry, createBooleanHollowCylinderGeometry, createBooleanRoundRoofGeometry } from "@/lib/roundBodyGeometry";
import { createPyramidGeometry } from "@/lib/pyramidGeometry";
import { roundSideCount } from "@/lib/roundSideCount";
import { createThreadGeometry, DEFAULT_THREAD_PROFILE, defaultThreadHeadHeight, normalizeThreadHeadHeight, threadNaturalFootprint, threadSettings } from "@/lib/threadGeometry";
import { createSpringGeometry } from "@/lib/springGeometry";
import { curvedTextPatch } from "@/lib/textGeometry";
import { textDisplayGeometry } from "@/lib/textFill";
import { DEFAULT_TEXT_LAYERS, layerTextKeyringArgument, layerTextLayersError, nameTagOffsets, normalizeTextLayers, textLayerShapes, textLayersOf, type NameTagKeyring, type TextLayer, type TextLayerStack } from "@/lib/textLayers";
import { NAME_TAG_LETTER_SIZE, textLetterSize, textLetterSizePatch } from "@/lib/nameTag";
import type { TextLayerPatch } from "@/components/workplane/ShapeInspector";
import { onManifoldReady, rememberManifoldRuntime, setManifoldLoader } from "@/lib/manifoldHandle";
import { canApplySketchCornerTreatment } from "@/lib/sketchFilletChamfer";
import { sketchPrimitiveGeometry } from "@/lib/sketchPrimitives";
import { cloneSketchProfile, orderedSketchPaths, withSegmentHandles, withSmoothSketchHandles } from "@/lib/sketchSmoothHandles";
import { curveSketchSegment, straightenSketchSegment } from "@/lib/sketchSegmentCurve";
import {
  SketchBoltCircleIcon,
  SketchEllipseIcon,
  SketchHalfCircleIcon,
  SketchPieSliceIcon,
  ToolbarAlignIcon,
  ToolbarCenterOnWorkplaneIcon,
  ToolbarChamferIcon,
  ToolbarCaretDownIcon,
  ToolbarCopyIcon,
  ToolbarDuplicateIcon,
  ToolbarDropToWorkplaneIcon,
  ToolbarBundleIcon,
  ToolbarGroupIcon,
  ToolbarGuideIcon,
  ToolbarHideSelectedIcon,
  ToolbarHomeIcon,
  ToolbarImportIcon,
  ToolbarIntersectionIcon,
  ToolbarKeyboardIcon,
  ToolbarFilletIcon,
  ToolbarHistoryIcon,
  ToolbarHollowIcon,
  ToolbarSimplifyIcon,
  ToolbarMirrorIcon,
  ToolbarRotationPivotIcon,
  ToolbarPatternIcon,
  ToolbarLayFlatIcon,
  ToolbarMateFacesIcon,
  ToolbarNoteIcon,
  ToolbarSplitIcon,
  ToolbarPasteIcon,
  ToolbarRedoIcon,
  ToolbarSnapGridIcon,
  ToolbarSettingsIcon,
  ToolbarShapeAddIcon,
  ToolbarTrashIcon,
  ToolbarUngroupIcon,
  ToolbarUndoIcon,
  ToolbarVectorExportIcon,
} from "./icons";
import { WorkplaneViewport, type LayFlatPick } from "./WorkplaneViewport";
import { layFlatRotation } from "@/lib/layFlat";
import { SketchWorkspace, type SketchMeasurement, type SketchPrimitive, type SketchSelection, type SketchTool } from "./SketchWorkspace";
import { EdgeModifierPanel } from "./workplane/EdgeModifierPanel";
import { ShellPanel } from "./workplane/ShellPanel";
import { MateFacesPanel } from "./workplane/MateFacesPanel";
import { mateMotion, type FacePick, type MateMode } from "@/lib/mateFaces";
import { carriedOntoFace } from "@/lib/carryOntoFace";
import { MeshSimplifyPanel } from "./workplane/MeshSimplifyPanel";
import { addCustomFontFile, customFontErrorMessage, FontManagerPanel } from "./workplane/FontManagerPanel";
import { onFontManagerRequested } from "@/lib/fontManagerEvents";
import { customFontList, onCustomFontsChanged, textFontLabel } from "@/lib/textFonts";
import { isCustomFontId } from "@/lib/customFonts";
import { storedCustomFonts } from "@/lib/customFontStore";
import { ArrayPanel } from "./workplane/ArrayPanel";
import { ScalePercentPanel, type ScalePercentSettings } from "./workplane/ScalePercentPanel";
import { scaleShapesByPercent } from "@/lib/scaleByPercent";
import { canToggleGroupColors, groupShowsPartColors } from "@/lib/groupColors";
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from "three-mesh-bvh";
import { meshForTwist, twistBandCount } from "@/lib/heightSlices";
import { SHELL_SIDES, shellMaxThickness, shellOpeningsFor, shellOpenSides } from "@/lib/shellLimits";
import { circleStepDegrees, clampArrayCount, moveAlongRadius, rotateAroundVertical, rowOffset, singleAxisSpacing, type ArraySettings } from "@/lib/shapeArray";
import { bedOverhangs, printerPresetById, type BedOverhang } from "@/lib/printBed";
import { SplitPanel } from "./workplane/SplitPanel";
import { groupedContentScale, scaleGroupedVertices } from "@/lib/groupScale";
import { dropSplitSlivers, unionSplitManifoldComponents } from "@/lib/manifoldSplit";
import { NO_SPLIT_ROTATION, modelSplitPlane, snapSplitPositionToVertices, splitOrientationForNormal, splitAxisFromLabel, splitAxisLabel, splitPlaneIntersectsPoints, splitRotationAxes, splitShapeFromWorldPositions, type ModelSplitPlane, type SplitRotation } from "@/lib/modelSplit";
import { GuideModal } from "./workplane/GuideModal";
import { HistoryViewOverlay, historyStateNameSuffix } from "./workplane/HistoryViewOverlay";
import { ShortcutsModal } from "./workplane/ShortcutsModal";
import { CommandPalette, type PaletteCommand } from "./workplane/CommandPalette";
import { COMMAND_KEYWORDS, SHAPE_KEYWORDS } from "@/lib/commandKeywords";
import { ShapeContextMenu, type ShapeContextMenuItem } from "./workplane/ShapeContextMenu";
import {
  canonicalizeShape,
  cloneWorkplaneShapeTreeWithFreshIds,
  cleanNearZero,
  cleanRotationDegrees,
  isNonSolidShapeKind,
  meshYawDegrees,
  mirroredAxisCount,
  mirrorSign,
  normalizeDegrees,
  preservesEdgeTreatmentSize,
  resizedImportedCoordinates,
  resizedImportedMeshPositions,
  resizedShapeSize,
  serializeShapesForSync,
  shapeDepth,
  shapeExtrudeDeformAt,
  shapeExtrudeDeformPatch,
  shapeHasExtrudeDeform,
  shapeHasShapeDeform,
  shapeHasTaper,
  shapeTaperPatch,
  shapeTransformShouldRemainEditable,
  shapeTaperScaleAt,
  shapeWidth,
  shapeWithParametricSource,
  patchTouchesBodyParameters,
  withHoleMode,
  workplaneShapesEqual,
  shellNeedingRebuild,
} from "@/lib/workplaneShapes";
import { workplaneCenteringOffset } from "@/lib/workplaneCentering";
import { bakeCadMetadataForShapeTransform, cadBrepTransformForShape, cadModifierPrimitiveForAnalyticShape, cadModifierPrimitiveForBakedShape, importedStepPartForShape } from "@/lib/cadBakeMetadata";
import { hasOneToOneCadComponentMapping } from "@/lib/cadModifierGroups";
import { cadModifierHelicalGearForShape, cadModifierProfileForShape, cadModifierSpringForShape, cadModifierThreadForShape, cadProfileExpectation, cadProfileSegmentCount, closedMeshVolume, textGlyphProfiles, withinExactProfileLimit } from "@/lib/cadProfileExtrusion";
import { DEFAULT_OVERHANG_ANGLE, normalizeOverhangAngle, overhangArea } from "@/lib/overhang";
import { sectionMeasurement, sectionPointToWorld, snapSectionPoint } from "@/lib/sectionMeasure";
import { DEFAULT_PRINT_MATERIAL, PRINT_MATERIAL_DENSITY, PRINT_MATERIALS, FILAMENT_DIAMETER_MM, normalizePrintMaterial, printEstimate, type PrintMaterial } from "@/lib/printEstimate";
import {
  CAD_MODIFIER_MAX_SHARP_ANGLE,
  CAD_MODIFIER_REQUEST_TIMEOUT_MS,
  CAD_MODIFIER_PREPARE_TRIANGLE_LIMIT,
  cadModifierPrepareTimeoutMs,
  cadModifierTimeoutMessage,
  cadModifierUserErrorMessage,
  cadModifierWorkerFailureMessage,
  cadModifierCandidateEdge,
  defaultCadModifierTangentChain,
  rescueSharpAngleForEdges,
  selectableCadModifierEdge,
  SKETCH_CAD_DEFLECTION,
  type CadModifierRequestPhase,
} from "@/lib/cadModifierRuntime";
import { createCadPreviewQueue } from "@/lib/cadPreviewQueue";
import { cloneWorkplaneShapeSnapshot, compactEdgeTreatmentHistory, edgeTreatmentAppliedFrame, restoreShapeBeforeEdgeTreatment } from "@/lib/edgeTreatmentHistory";
import { appendEditorHistorySnapshot, boundedEditorHistoryState, editorHistoryBranch, editorHistoryEntry, editorHistoryForExport, historyStateAt, hydrateEditorHistoryState, notesForHistoryIndex, projectSceneFingerprint, projectShapesFingerprint, workplaneForHistoryIndex, type EditorHistoryEntry, type EditorHistoryExportLimit, type EditorHistoryState } from "@/lib/editorHistory";
import { snapShapeFootprintToVisibleGrid, visibleGridStep } from "@/lib/gridSnap";
import { composedShapeRotation, geometryRotationDegreesForShortcut, geometryRotationDelta, rotatedGeometryShapePatch } from "@/lib/geometryRotation";
import { carryShapePivot, shapePivotFromWorld, shapePivotWorld, type PivotPoint } from "@/lib/rotationPivot";
import { createLocalId, derivedLocalId } from "@/lib/localIds";
import { canEditGroupAtLevel, openGroupLevelsStillOpen, trackOpenGroupLevels } from "@/lib/openGroupParts";
import { projectExportFileName } from "@/lib/exportNames";
import { exportMeshesToObj } from "@/lib/objExport";
import { boundsOverlap, exportColorGroups, meshBounds, overlappingExportClusters } from "@/lib/exportUnion";
import { rotateSketchPoints, selectedClosedSketchPoints } from "@/lib/sketchRotation";
import { PROJECT_THUMBNAIL_IDLE_MS, projectThumbnailSceneChanged, type ProjectThumbnailSceneKey } from "@/lib/projectThumbnail";
import { importedShapeFromObj } from "@/lib/objImport";
import { importFailureSummary, importModelFiles } from "@/lib/modelImport";
import { dedupeProjectAssets } from "@/lib/projectAssets";
import { customShapesBackupEntries, deleteMyShape, listMyShapes, myShapeNameFromFile, restoreCustomShapesFromBackup, myShapesBackupFileName, onMyShapesChanged, readMyShapePackage, renameMyShape, saveMyShape, shapesForLibrary, shapesFromLibrary, type MyShapeMeta } from "@/lib/myShapes";
import { renderMyShapeThumbnail } from "@/lib/myShapeThumbnail";
import { packBackup, unpackBackup } from "@/lib/projectBackup";
import { MyShapesSection, type CustomShapeEntry, type CustomShapeLocation } from "@/components/workplane/MyShapesSection";
import { deleteServerCustomShape, listServerCustomShapes, readServerCustomShape, renameServerCustomShape, saveServerCustomShape, type ServerCustomShape } from "@/lib/customShapesServer";
import { addLineIntersectionPoints, splitSketchSegment } from "@/lib/sketchPointRefinement";
import { copySketchSelection, freeSketchPasteOffset, pasteSketchClipboard, type SketchClipboard } from "@/lib/sketchClipboard";
import { sketchSelectionCount, toggleSketchSelection } from "@/lib/sketchSelection";
import { applySketchChamfer, applySketchFillet } from "@/lib/sketchFilletChamfer";
import { revolveProfileFitsAxis } from "@/lib/cadSketchRevolve";
import { revolveAxisShift } from "@/lib/revolveAxis";
import { buildSketchRevolveMesh, DEFAULT_SKETCH_REVOLVE_SETTINGS, normalizeSketchRevolveSettings, type SketchRevolveMesh } from "@/lib/sketchRevolve";
import { AppFooter } from "@/components/AppFooter";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { useFileAccept } from "@/lib/fileAccept";
import { exportLylProject, importLylProject, LYL_CREATED_WITH_VERSION, LYL_MEDIA_TYPE } from "@/lib/lylProject";
import { simplifyTrianglePositions } from "@/lib/meshSimplify";
import { displayShapeName, libraryShapeAssets, makeShapeFromAsset, nameTagAsset, sceneShape, shapeAssetLabel, shapeAssetMenuLabel, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { importedShapeFromStl } from "@/lib/stlImport";
import { exportMeshesToStl } from "@/lib/stlExport";
import { exportMeshesTo3mf, THREE_MF_MEDIA_TYPE } from "@/lib/threemfExport";
import { importedShapeFromSvg, invalidSvgMeshReason } from "@/lib/svgImport";
import { toSvgProjection, type SvgProjectionLayer } from "@/lib/svgExport";
import { DEFAULT_TAPER_DIMENSION_MAX, keyboardNudgeStep, normalizeShapeCustomizations, normalizeSnapGrid, normalizeWorkspaceSettings, shapeDimensionLimit, workplaneSettingsFingerprint } from "@/lib/workplaneSettings";
import { MCP_SHAPE_SETTING_KEYS, mcpThreadSizeName, mcpThreadSizeParams } from "@/lib/mcpShapeSettings";
import { createNoteId, detachNotesFromMissingShapes, normalizeNotes, NOTE_COUNT_LIMIT, NOTE_TEXT_LIMIT, referencePoints } from "@/lib/workplaneNotes";
import { newReferencePositions, referencePointsForBox, unionReferenceBoxes, type ReferencePointSpot, type ReferencePosition } from "@/lib/referencePoints";
import {
  normalizePlacementWorkplane,
  placementPatchForNewShape,
  placementWorkplaneCoordinates,
  placementWorkplaneFingerprint,
  placementWorkplaneFromSurface,
  placementWorkplaneIsBase,
  placementWorkplanePoint,
  horizontalPlacementWorkplane,
  translationToWorkplane,
  type PlacementPoint,
  type PlacementWorkplane,
} from "@/lib/placementWorkplane";
import { localizedError } from "@/lib/userErrors";
import { sketchBodyStretch, stretchedSketchProfile } from "@/lib/sketchResize";
import { silhouetteSketchProfile } from "@/lib/sketchCadProfile";
import { svgSketchMatchesMesh } from "@/lib/svgSketch";
import { DEFAULT_SKETCH_STROKE, normalizeSketchStroke, strokedSketchProfile } from "@/lib/sketchStroke";
import { topCadModifierEdgeIds } from "@/lib/topEdges";
import { placeSketchShape } from "@/lib/sketchPlacement";
import { meshSlicePath, planeCutsMesh } from "@/lib/sketchSlice";
import { BUG_REPORT_FILE, bugReportText, rememberBugReportEvent, type BugReportEvent } from "@/lib/bugReport";
import { formatLengthMm, lengthDisplayUnit } from "@/lib/measurementUnits";
import { wrapMeshAroundCylinder, type CylinderWrapError } from "@/lib/cylinderWrap";
import { screenAlignedNudge } from "@/lib/keyboardNudge";
import {
  LAYERLING_MCP_HEARTBEAT_MS,
  LAYERLING_MCP_POLL_RETRY_MS,
  LAYERLING_MCP_ROUTE,
  type LayerlingMcpCommand,
  type LayerlingMcpSceneSummary,
  type LayerlingMcpShapeSummary,
  type LayerlingMcpViewFace,
} from "@/lib/layerlingMcpProtocol";
import type { CadModifierComponentMesh, CadModifierDeflection, CadModifierDisplayEdge, CadModifierEdge, CadModifierHelicalGearPart, CadModifierKind, CadModifierMeshPart, CadModifierPrimitivePart, CadModifierProfilePart, CadModifierQuality, CadModifierSpringPart, CadModifierThreadPart, CadModifierWorkerRequest, CadModifierWorkerResponse } from "@/lib/cadModifierTypes";
import type { SketchCadBuildResponse } from "@/lib/sketchCadTypes";
import { getSectionBounds, sectionAxisLetter, type SectionPlaneAxis, type SectionPlaneSettings } from "@/lib/sectionView";
import { projectSectionPoint, SECTION_VIEW_FACE, sectionSvgDocument, sliceMeshContours } from "@/lib/sectionSvg";
import type { AlignAxis, AlignHandleStatus, AlignTarget, GridSize, ParametricSource, ProjectAsset, ShapeAsset, ShapeCustomization, ShapeKind, SketchImage, SketchOperation, SketchPoint, SketchProfile, SketchRevolveSettings, SketchSegment, ShellEdges, ShellOpenings, ShellSide, WorkplaneNote, WorkplaneShape, WorkplaneWorkspaceSettings } from "@/types/layerling";

export { importedShapeFromObj, importedShapeFromStl, importedShapeFromSvg };

type TopPanel = "import" | "export" | null;

/** Die Befehle der Suche, die im Verlaufsblick wach bleiben: sie aendern nichts am Entwurf. */
const HISTORY_VIEW_COMMANDS = new Set(["history", "export", "guide", "shortcuts"]);

/** MCP actions that only read or change the view, so they still work while the history view is open. */
const HISTORY_VIEW_MCP_ACTIONS = new Set([
  "get_scene",
  "list_objects",
  "list_custom_shapes",
  "inspect_errors",
  "estimate_print",
  "list_reference_points",
  "show_overhangs",
  "measure_section",
  "set_section_view",
  "show_workplane",
  "export_section_svg",
  "capture_image",
  "set_history_view",
]);

/**
 * Was der Verlaufsblick mitgibt, wenn aus einem frueheren Stand ein neues
 * Projekt werden soll. Die Uebersicht legt es an; der Editor bleibt, wo er ist.
 */
export type HistoryProjectRequest = {
  sourceProjectId: string | null;
  /** Der gewuenschte Name, oder null, wenn die Uebersicht einen Kopie-Namen vergeben soll. */
  name: string | null;
  shapes: WorkplaneShape[];
  history: EditorHistoryEntry[];
  historyIndex: number;
  assets: ProjectAsset[];
  workspace: WorkplaneWorkspaceSettings;
  snapGrid: GridSize;
  placementElevation: number;
  placementWorkplane: PlacementWorkplane;
  /** Das Bild der Arbeitsflaeche in diesem Stand, fuer die Karte in der Uebersicht. */
  thumbnailDataUrl: string | null;
};
type ExportFormat = "stl" | "3mf" | "obj" | "step" | "svg" | "png" | "lyl";
type DirectExportFormat = Exclude<ExportFormat, "step" | "png" | "lyl">;
type ViewImageOptions = { plate: boolean; transparent: boolean };
type LylHistoryLimit = EditorHistoryExportLimit;
type LylExportTarget = "download" | "shared";
type ToolbarMode = "geometry" | "sketch";
type Vec3 = [number, number, number];
type MeshData = { name: string; vertices: Vec3[]; faces: [number, number, number][] };
type Cuboid = { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
type ShapeUpdatePatch = Partial<WorkplaneShape> & { bakeTransform?: boolean };
type OpenGroupOutcome = { ok: boolean; message: string; partIds?: string[]; groupId?: string };
/** One group being edited: the group as it was, and the ids of its loose parts. */
type OpenGroupLevel = { original: WorkplaneShape; childIds: string[] };

function mcpOpenGroupSummary(level: OpenGroupLevel) {
  return { groupId: level.original.id, name: displayShapeName(level.original), partIds: level.childIds };
}
type WithoutRequestId<T> = T extends unknown ? Omit<T, "requestId"> : never;
type CadModifierWorkerPayload = WithoutRequestId<CadModifierWorkerRequest>;
type CadPreviewPayload = Extract<CadModifierWorkerPayload, { type: "preview" }>;
type EdgeModifierSession = {
  kind: CadModifierKind;
  edges: CadModifierEdge[];
  selectedEdgeIds: number[];
  amount: number;
  sharpAngle: number;
  chamferAngle: number;
  quality: CadModifierQuality;
  tangentChain: boolean;
  preserveEdgeSize: boolean;
  busy: boolean;
  prepared: boolean;
  error: string | null;
  preview: WorkplaneShape | null;
  componentPreviews: EdgeModifierComponentPreview[];
};

type SplitSession = {
  targetIds: string[];
  axis: AlignAxis;
  rotation: SplitRotation;
  position: number;
  pivot: [number, number, number];
  sourceFingerprint: string;
  busy: boolean;
  error: string | null;
  /** The next click on a face sets the plane's position. */
  picking: boolean;
};

type EdgeModifierComponentPreview = {
  owner: number;
  shape: WorkplaneShape;
};
type EdgeFeatureRevertOption = {
  id: string;
  entryId: string;
  path: number[];
  label: string;
  kind: CadModifierKind;
  amount: number;
  edgeCount: number;
  targetName: string;
  createdAt: number;
  removesNewerCount: number;
};
type ManifoldSolid = ReturnType<ManifoldToplevel["Manifold"]["cube"]>;
type GroupBuildResult = {
  group: WorkplaneShape | null;
  booleanSelection: WorkplaneShape[];
  hasSolid: boolean;
  hasHole: boolean;
  hasImportedMesh: boolean;
  consumed: boolean;
  failureNotice: string;
};
type IntersectionAttempt =
  | { status: "success"; group: WorkplaneShape }
  | { status: "empty" }
  | { status: "unsupported" };
type IntersectionBuildResult = {
  group: WorkplaneShape | null;
  empty: boolean;
  failureNotice: string;
};
type BooleanAutomationMode = "before" | "after" | "ungroup";
type BooleanAutomationResult = {
  ok: boolean;
  caseId: string;
  label: string;
  mode: BooleanAutomationMode;
  notice: string;
  shapeCount: number;
  selectedCount: number;
  triangleCount?: number;
  groupedCount?: number;
  groupId?: string;
  error?: string;
};
const SHARED_CLIPBOARD_STORAGE_KEY = "layerling.clipboard";
const SYSTEM_CLIPBOARD_PREFIX = "LAYERLING/1\n";

declare global {
  interface Window {
    __layerlingBooleanTest?: BooleanAutomationResult;
    __layerlingBooleanTestImage?: string;
    layerlingCaptureCanvas?: () => string;
    layerlingCaptureCanvasAsync?: () => Promise<string>;
    layerlingCaptureView?: (face?: LayerlingMcpViewFace) => Promise<string> | string;
    /** Turns the view about its centre: azimuth around the vertical, polar towards or away from straight down. */
    layerlingOrbitView?: (azimuthDegrees: number, polarDegrees: number) => void;
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

const CUTTER_PADDING = 0.05;
const POINT_TOLERANCE = 0.0001;
const CUTTER_RESIDUAL_INSET = CUTTER_PADDING * 0.4;
const MIN_SHAPE_DIMENSION = 0.01;
/** So lange darf das Vorschaubild den Weg zur Uebersicht aufhalten. */
const LEAVE_SNAPSHOT_DEADLINE_MS = 600;
/**
 * Longest a held interaction may keep changes from being saved once nothing
 * moves any more. A drag in progress keeps changing and so keeps waiting.
 */
const PROJECT_SYNC_HELD_MAX_MS = 2000;

/**
 * So lange darf eine Notiz getippt oder gezogen werden, ohne dass daraus ein
 * Schritt im Verlauf wird. Danach steht sie darin - wie ein Absatz in einem
 * Textfeld, nicht wie ein Buchstabe.
 */
const NOTE_COMMIT_IDLE_MS = 700;

/** So lange bleibt eine gewoehnliche Meldung stehen. */
const NOTICE_LINGER_MS = 4000;
/**
 * So lange bleibt eine Meldung stehen, die etwas will oder auf Arbeit wartet.
 * Auch sie geht irgendwann: Ein Fenster, das nie verschwindet, ist ein Fleck
 * auf der Arbeitsflaeche.
 */
const NOTICE_PATIENT_MS = 30000;
const MAX_SKETCH_HISTORY_ENTRIES = 100;
const MODEL_DIMENSION_PRECISION = 3;
// The exact kernel (Manifold) cuts a few hundred thousand triangles in about a
// second; its limit is the workspace setting handed to the boolean helpers
// below. The triangle-soup fallback for meshes that are not watertight is far
// slower and keeps this lower limit so it cannot freeze the editor.
const IMPORTED_FALLBACK_BOOLEAN_TRIANGLE_LIMIT = 150000;
const COPLANAR_BOOLEAN_RESCUE_DEGREES = 0.02;
const NORMAL_SELECTION_CAD_EDGE_MIN_ANGLE = 60;
const MIN_EDGE_MODIFIER_AMOUNT = 0.001;
const SEPARATE_PARTS_VERTEX_TOLERANCE = 0.0005;
let manifoldRuntimePromise: Promise<ManifoldToplevel> | null = null;

function emptySketchProfile(): SketchProfile {
  return { points: [], segments: [], images: [] };
}

let sketchCadWorker: Worker | null = null;
let sketchCadRequestId = 0;
const sketchCadPending = new Map<number, {
  resolve: (response: SketchCadBuildResponse) => void;
  reject: (error: Error) => void;
  timer: number;
}>();

function ensureSketchCadWorker() {
  if (sketchCadWorker) return sketchCadWorker;
  const worker = new Worker(new URL("../workers/sketchCad.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (event: MessageEvent<SketchCadBuildResponse>) => {
    const pending = sketchCadPending.get(event.data.requestId);
    if (!pending) return;
    window.clearTimeout(pending.timer);
    sketchCadPending.delete(event.data.requestId);
    pending.resolve(event.data);
  };
  worker.onerror = () => {
    sketchCadPending.forEach((pending) => {
      window.clearTimeout(pending.timer);
      // Most often the page outlived an update and its worker file is gone.
      pending.reject(new Error(t("edge.errorWorkerFailed")));
    });
    sketchCadPending.clear();
    worker.terminate();
    sketchCadWorker = null;
  };
  sketchCadWorker = worker;
  return worker;
}

async function cadShapeFromSketchProfile(profile: SketchProfile, height: number, existing?: WorkplaneShape | null) {
  const safeHeight = Math.max(MIN_SHAPE_DIMENSION, height);
  // A stroked sketch builds from the outline of its line; the body keeps the drawn line (#154).
  // A silhouette leaves its holes out first, so its outer line runs round the outside only (#197).
  let buildProfile = profile.silhouette ? silhouetteSketchProfile(profile) : profile;
  if (profile.stroke) {
    const stroked = strokedSketchProfile(await getManifoldRuntime(), buildProfile);
    if (!stroked) throw new Error(t("sketch.strokeEmpty"));
    buildProfile = stroked;
  }
  const worker = ensureSketchCadWorker();
  const requestId = ++sketchCadRequestId;
  const response = await new Promise<SketchCadBuildResponse>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      sketchCadPending.delete(requestId);
      reject(new Error("OpenCascade timed out while building the sketch"));
    }, 30_000);
    sketchCadPending.set(requestId, { resolve, reject, timer });
    worker.postMessage({ type: "build", requestId, profile: cloneSketchProfile(buildProfile), height: safeHeight });
  });
  if (response.type === "error") throw new Error(response.message);
  const source = canonicalizeShape({
    ...(existing ?? {
      id: createLocalId("sketch-extrusion"),
      name: "Sketch extrusion",
      kind: "mesh" as const,
      color: "#d41721",
      x: 0,
      z: 0,
      size: 1,
      width: 1,
      depth: 1,
      height: safeHeight,
      rotation: 0,
    }),
    sketchProfile: cloneSketchProfile(profile),
    sketchOperation: "extrude",
    edgeTreatments: undefined,
    edgeTreatmentHistory: undefined,
    cadDisplayEdges: undefined,
    cadDisplayEdgesVersion: undefined,
  });
  const shape = shapeFromCadMesh(source, response.positions, response.normals, response.indices, response.brep, SKETCH_CAD_DEFLECTION);
  if (!shape) throw new Error("OpenCascade returned an empty sketch solid");
  return { ...shape, sketchProfile: cloneSketchProfile(profile), sketchOperation: "extrude" as const };
}

/**
 * A revolved sketch as an exact CAD body, like an extruded one: the profile is turned about the
 * axis by OpenCascade, so Hollow, Fillet and Chamfer work on it and it has a few hundred
 * triangles, not tens of thousands (#167). Null when the profile cannot be built that way (it
 * crosses the axis) or the kernel refuses; the mesh revolve takes over then.
 */
async function cadShapeFromSketchRevolve(
  profile: SketchProfile,
  settings: SketchRevolveSettings,
  existing?: WorkplaneShape | null,
): Promise<WorkplaneShape | null> {
  if (!revolveProfileFitsAxis(profile)) return null;
  try {
    const worker = ensureSketchCadWorker();
    const requestId = ++sketchCadRequestId;
    const response = await new Promise<SketchCadBuildResponse>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        sketchCadPending.delete(requestId);
        reject(new Error("OpenCascade timed out while building the sketch"));
      }, 30_000);
      sketchCadPending.set(requestId, { resolve, reject, timer });
      worker.postMessage({
        type: "build",
        requestId,
        profile: cloneSketchProfile(profile),
        height: MIN_SHAPE_DIMENSION,
        revolve: { startAngle: settings.startAngle, sweepAngle: settings.sweepAngle },
      });
    });
    if (response.type === "error") return null;
    const source = canonicalizeShape({
      id: existing?.id ?? createLocalId("sketch-revolve"),
      name: existing?.name ?? "Sketch revolve",
      kind: "mesh",
      color: existing?.color ?? "#78b96b",
      hole: existing?.hole,
      x: 0,
      z: 0,
      elevation: 0,
      size: 1,
      width: 1,
      depth: 1,
      height: MIN_SHAPE_DIMENSION,
      rotation: 0,
      sketchProfile: cloneSketchProfile(profile),
      sketchOperation: "revolve",
      sketchRevolve: settings,
      locked: existing?.locked ?? false,
      hidden: existing?.hidden ?? false,
    } satisfies WorkplaneShape);
    const shape = shapeFromCadMesh(source, response.positions, response.normals, response.indices, response.brep, SKETCH_CAD_DEFLECTION);
    if (!shape) return null;
    // Like the mesh revolve: the body stands at the origin (or where the edited one stood); the
    // exact body keeps its own frame, so it follows the move.
    return canonicalizeShape({
      ...shape,
      x: existing?.x ?? 0,
      z: existing?.z ?? 0,
      elevation: existing?.elevation ?? 0,
      sketchProfile: cloneSketchProfile(profile),
      sketchOperation: "revolve",
      sketchRevolve: settings,
    });
  } catch {
    return null;
  }
}

async function shapeFromRevolvedSketchProfile(
  profile: SketchProfile,
  settings: Partial<SketchRevolveSettings>,
  existing?: WorkplaneShape | null,
) {
  const exact = await cadShapeFromSketchRevolve(profile, normalizeSketchRevolveSettings(settings), existing);
  if (exact) return exact;
  const runtime = await getManifoldRuntime();
  const normalizedSettings = normalizeSketchRevolveSettings(settings);
  const mesh = buildSketchRevolveMesh(runtime, profile, normalizedSettings);
  return canonicalizeShape({
    id: existing?.id ?? createLocalId("sketch-revolve"),
    name: existing?.name ?? "Sketch revolve",
    kind: "mesh",
    color: existing?.color ?? "#78b96b",
    hole: existing?.hole,
    x: existing?.x ?? 0,
    z: existing?.z ?? 0,
    elevation: existing?.elevation ?? 0,
    size: Math.max(mesh.width, mesh.depth),
    width: mesh.width,
    depth: mesh.depth,
    height: mesh.height,
    rotation: existing?.rotation ?? 0,
    rotationX: existing?.rotationX ?? 0,
    rotationZ: existing?.rotationZ ?? 0,
    mirrorX: existing?.mirrorX,
    mirrorY: existing?.mirrorY,
    mirrorZ: existing?.mirrorZ,
    importedMesh: {
      positions: mesh.positions,
      baseWidth: mesh.width,
      baseDepth: mesh.depth,
      baseHeight: mesh.height,
      triangleCount: mesh.triangleCount,
      sourceFormat: "json",
    },
    sketchProfile: cloneSketchProfile(profile),
    sketchOperation: "revolve",
    sketchRevolve: normalizedSettings,
    locked: existing?.locked ?? false,
    hidden: existing?.hidden ?? false,
  } satisfies WorkplaneShape);
}

function cleanModelDimension(value: number) {
  return Math.max(MIN_SHAPE_DIMENSION, Number(value.toFixed(MODEL_DIMENSION_PRECISION)));
}

function parseClipboardShapes(serialized: string): ClipboardPayload<WorkplaneShape> | null {
  const payload = decodeClipboardPayload(serialized);
  if (!payload) return null;
  const shapes = payload.shapes.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const shape = entry as Partial<WorkplaneShape>;
    const { name, kind, color } = shape;
    if (typeof name !== "string" || typeof kind !== "string" || typeof color !== "string") {
      return [];
    }
    return [canonicalizeShape(sceneShape({ ...shape, name, kind, color }))];
  });
  return { copiedAt: payload.copiedAt, shapes };
}

function readSharedClipboard(): ClipboardPayload<WorkplaneShape> | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const stored = window.localStorage.getItem(SHARED_CLIPBOARD_STORAGE_KEY);
    if (!stored) return null;
    // A large copy from an older layerling may still sit here and crowd out
    // the project list; the tab and the system clipboard carry large copies.
    if (stored.length > LOCAL_CLIPBOARD_LIMIT) {
      window.localStorage.removeItem(SHARED_CLIPBOARD_STORAGE_KEY);
      return null;
    }
    return parseClipboardShapes(stored);
  } catch {
    return null;
  }
}

async function readSystemClipboard(): Promise<ClipboardPayload<WorkplaneShape> | null> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.readText) {
    return null;
  }
  try {
    const value = await navigator.clipboard.readText();
    if (!value.startsWith(SYSTEM_CLIPBOARD_PREFIX)) return null;
    return parseClipboardShapes(value.slice(SYSTEM_CLIPBOARD_PREFIX.length));
  } catch {
    return null;
  }
}

function copyTextWithSelectionFallback(value: string) {
  if (typeof document === "undefined" || typeof document.execCommand !== "function") {
    return;
  }
  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.readOnly = true;
  textarea.setAttribute("aria-hidden", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-10000px";
  textarea.style.top = "0";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
  } catch {
    // The modern Clipboard API below may still succeed.
  }
  textarea.remove();
  previousFocus?.focus({ preventScroll: true });
}

function writeSharedClipboard(shapes: WorkplaneShape[], copiedAt: number) {
  if (typeof window === "undefined") {
    return;
  }
  const serialized = encodeClipboardPayload(serializeShapesForSync(shapes), copiedAt);
  try {
    if (serialized.length > LOCAL_CLIPBOARD_LIMIT) {
      // Too large for the small local storage: an older copy must not stay
      // behind there either, or another tab would paste that instead.
      window.localStorage.removeItem(SHARED_CLIPBOARD_STORAGE_KEY);
    } else {
      window.localStorage.setItem(SHARED_CLIPBOARD_STORAGE_KEY, serialized);
    }
  } catch {
    try {
      window.localStorage.removeItem(SHARED_CLIPBOARD_STORAGE_KEY);
    } catch {
      // storage unavailable - the tab and the system clipboard still hold the copy
    }
  }
  const systemPayload = `${SYSTEM_CLIPBOARD_PREFIX}${serialized}`;
  copyTextWithSelectionFallback(systemPayload);
  if (navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(systemPayload).catch(() => {
      // Same-origin tabs still have the local-storage fallback.
    });
  }
}

function getManifoldRuntime() {
  const assetBase = typeof window === "undefined" ? "/" : new URL(".", window.location.href).href;
  const manifoldScriptUrl = new URL("manifold.js", assetBase).href;
  const runtimeModule = import(/* webpackIgnore: true */ manifoldScriptUrl).then((module) => (module as { default: typeof manifoldModule }).default);
  // Drop a rejected attempt so a transient failure (e.g. a network blip
  // fetching the manifold wasm) can be retried on the next call instead of
  // poisoning every boolean operation for the rest of the session - same fix
  // as brepKernel.ts's loadBrepWithOcct.
  manifoldRuntimePromise ??= runtimeModule
    .then((module) => {
      return module({
        locateFile: ((file: string) => (file.endsWith(".wasm") ? new URL("manifold.wasm", assetBase).href : new URL(file, assetBase).href)) as () => string,
      });
    })
    .then((runtime) => {
      runtime.setup();
      // Text fills (#215) build on the spot and need the runtime without awaiting it.
      rememberManifoldRuntime(runtime);
      return runtime;
    })
    .catch((error) => {
      manifoldRuntimePromise = null;
      throw error;
    });
  return manifoldRuntimePromise;
}
setManifoldLoader(getManifoldRuntime);
function stlBoxTrianglePositions(width: number, depth: number, height: number) {
  const x = width / 2;
  const z = depth / 2;
  const vertices: Vec3[] = [
    [-x, 0, -z],
    [x, 0, -z],
    [x, 0, z],
    [-x, 0, z],
    [-x, height, -z],
    [x, height, -z],
    [x, height, z],
    [-x, height, z],
  ];
  const faces: [number, number, number][] = [
    [0, 1, 2],
    [0, 2, 3],
    [4, 6, 5],
    [4, 7, 6],
    [0, 5, 1],
    [0, 4, 5],
    [1, 6, 2],
    [1, 5, 6],
    [2, 7, 3],
    [2, 6, 7],
    [3, 4, 0],
    [3, 7, 4],
  ];
  return faces.flatMap((face) => face.flatMap((index) => vertices[index]));
}

function automationSolidBox(overrides: Partial<WorkplaneShape> = {}) {
  return sceneShape({
    id: "solid-cube",
    name: "Solid cube",
    kind: "box",
    color: "#d41721",
    x: 0,
    z: 0,
    width: 28,
    depth: 28,
    height: 28,
    ...overrides,
  });
}

function automationHoleBox(overrides: Partial<WorkplaneShape> = {}) {
  return sceneShape({
    id: "hole-cube",
    name: "Hole cube",
    kind: "box",
    color: "#b8c2cc",
    hole: true,
    x: 0,
    z: 0,
    elevation: -4,
    width: 13,
    depth: 40,
    height: 36,
    ...overrides,
  });
}

function automationImportedStlBox(overrides: Partial<WorkplaneShape> = {}) {
  const width = overrides.width ?? 28;
  const depth = overrides.depth ?? 28;
  const height = overrides.height ?? 28;
  return sceneShape({
    id: "imported-stl-cube",
    name: "Imported STL cube",
    kind: "mesh",
    color: "#0098c7",
    x: 0,
    z: 0,
    width,
    depth,
    height,
    importedMesh: {
      positions: stlBoxTrianglePositions(width, depth, height),
      baseWidth: width,
      baseDepth: depth,
      baseHeight: height,
      triangleCount: 12,
      sourceFormat: "stl",
    },
    ...overrides,
  });
}

function automationHoleStlBox(overrides: Partial<WorkplaneShape> = {}) {
  return automationImportedStlBox({
    id: "hole-stl",
    name: "Hole STL",
    color: "#b8c2cc",
    hole: true,
    elevation: -4,
    width: 13,
    depth: 40,
    height: 38,
    ...overrides,
  });
}

function automationImportedStlFromShapes(id: string, name: string, color: string, parts: WorkplaneShape[], overrides: Partial<WorkplaneShape> = {}) {
  const vertices: Vec3[] = [];
  const faces: [number, number, number][] = [];
  parts.forEach((part) => appendMeshData(vertices, faces, meshForShape(part)));
  const bounds = boundsForCuboids([{ minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 }, ...parts.map(meshAabb)]);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const depth = Math.max(1, bounds.maxZ - bounds.minZ);
  const height = Math.max(1, bounds.maxY - bounds.minY);
  const positions: number[] = [];
  faces.forEach(([ai, bi, ci]) => {
    [vertices[ai], vertices[bi], vertices[ci]].forEach(([x, y, z]) => {
      positions.push(x - centerX, y - bounds.minY, z - centerZ);
    });
  });

  return sceneShape({
    id,
    name,
    kind: "mesh",
    color,
    x: centerX,
    z: centerZ,
    elevation: bounds.minY,
    width,
    depth,
    height,
    importedMesh: {
      positions,
      baseWidth: width,
      baseDepth: depth,
      baseHeight: height,
      triangleCount: faces.length,
      sourceFormat: "stl",
    },
    ...overrides,
  });
}

function automationRaspberryPiStl(overrides: Partial<WorkplaneShape> = {}) {
  const parts: WorkplaneShape[] = [
    sceneShape({ id: "raspi-board", name: "Board", kind: "box", color: "#1f9f5f", width: 70, depth: 48, height: 3, elevation: 0 }),
    sceneShape({ id: "raspi-soc", name: "Main chip", kind: "box", color: "#30343b", x: -8, z: 0, width: 15, depth: 15, height: 3.2, elevation: 3 }),
    sceneShape({ id: "raspi-memory", name: "Memory chip", kind: "box", color: "#2b2e34", x: 10, z: 1, width: 11, depth: 13, height: 2.8, elevation: 3 }),
    sceneShape({ id: "raspi-usb-a", name: "USB block", kind: "box", color: "#b9c1c9", x: 23, z: -13, width: 17, depth: 11, height: 9, elevation: 3 }),
    sceneShape({ id: "raspi-usb-b", name: "USB block", kind: "box", color: "#b9c1c9", x: 23, z: 4, width: 17, depth: 11, height: 9, elevation: 3 }),
    sceneShape({ id: "raspi-ethernet", name: "Ethernet jack", kind: "box", color: "#c4c9ce", x: 23, z: 18, width: 18, depth: 13, height: 11, elevation: 3 }),
    sceneShape({ id: "raspi-hdmi", name: "HDMI", kind: "box", color: "#c9c0b2", x: -15, z: -22, width: 16, depth: 5, height: 4, elevation: 3 }),
    sceneShape({ id: "raspi-camera", name: "Camera connector", kind: "box", color: "#2b2e34", x: -28, z: 4, width: 5, depth: 20, height: 3, elevation: 3 }),
    sceneShape({ id: "raspi-mount-a", name: "Mount", kind: "cylinder", color: "#1f9f5f", x: -29, z: -17, width: 6, depth: 6, height: 3.4, elevation: 0, sides: 32 }),
    sceneShape({ id: "raspi-mount-b", name: "Mount", kind: "cylinder", color: "#1f9f5f", x: 29, z: -17, width: 6, depth: 6, height: 3.4, elevation: 0, sides: 32 }),
    sceneShape({ id: "raspi-mount-c", name: "Mount", kind: "cylinder", color: "#1f9f5f", x: -29, z: 17, width: 6, depth: 6, height: 3.4, elevation: 0, sides: 32 }),
    sceneShape({ id: "raspi-mount-d", name: "Mount", kind: "cylinder", color: "#1f9f5f", x: 29, z: 17, width: 6, depth: 6, height: 3.4, elevation: 0, sides: 32 }),
    ...Array.from({ length: 14 }, (_, index) =>
      sceneShape({
        id: `raspi-pin-${index}`,
        name: "GPIO pin",
        kind: "box",
        color: "#e2b94f",
        x: -29 + index * 4,
        z: 23,
        width: 1.6,
        depth: 2.6,
        height: 6,
        elevation: 3,
      }),
    ),
  ];
  return automationImportedStlFromShapes("raspberry-pi-stl", "Raspberry Pi-like STL", "#0098c7", parts, overrides);
}

const booleanAutomationShapeConfigs: Record<
  string,
  {
    name: string;
    kind: WorkplaneShape["kind"];
    color: string;
    width?: number;
    depth?: number;
    height?: number;
    props?: Partial<WorkplaneShape>;
  }
> = {
  cube: { name: "Cube", kind: "box", color: "#d41721" },
  cylinder: { name: "Cylinder", kind: "cylinder", color: "#d97813", props: { sides: 96, segments: 1 } },
  sphere: { name: "Sphere", kind: "sphere", color: "#0098c7", props: { steps: 28, sides: 56 } },
  cone: { name: "Cone", kind: "cone", color: "#6e2786", props: { sides: 96, topRadius: 0, baseRadius: 14 } },
  pyramid: { name: "Pyramid", kind: "pyramid", color: "#f2cf10", props: { sides: 4 } },
  wedge: { name: "Wedge", kind: "wedge", color: "#33983d" },
  text: { name: "Text", kind: "text", color: "#cf101b", width: 34, depth: 18, height: 28, props: { text: "T", font: "Sans" } },
  "round-roof": { name: "Round Roof", kind: "roundRoof", color: "#67c4ce", props: { sides: 64 } },
  "half-sphere": { name: "Half Sphere", kind: "halfSphere", color: "#c9009a", props: { steps: 32 } },
  torus: { name: "Torus", kind: "torus", color: "#0098c7", width: 34, depth: 34, height: 8, props: { sides: 96 } },
  tube: { name: "Tube", kind: "tube", color: "#ce7013", width: 34, depth: 34, height: 28, props: { bevel: 6, sides: 96 } },
};

function automationShape(key: string, overrides: Partial<WorkplaneShape> = {}) {
  const config = booleanAutomationShapeConfigs[key];
  if (!config) {
    return null;
  }

  const width = overrides.width ?? config.width ?? 28;
  const depth = overrides.depth ?? config.depth ?? 28;
  const height = overrides.height ?? config.height ?? 28;
  return sceneShape({
    id: `${overrides.hole ? "hole" : "solid"}-${key}`,
    name: config.name,
    kind: config.kind,
    color: config.color,
    x: 0,
    z: 0,
    width,
    depth,
    height,
    size: Math.max(width, depth),
    ...config.props,
    ...overrides,
  });
}

function automationHoleShape(key: string, overrides: Partial<WorkplaneShape> = {}) {
  const shape = automationShape(key, {
    hole: true,
    color: "#b8c2cc",
    elevation: key === "torus" ? 18 : -3,
    rotation: 27,
    width: key === "text" ? 32 : key === "torus" || key === "tube" ? 34 : 24,
    depth: key === "text" ? 17 : key === "torus" || key === "tube" ? 34 : 24,
    height: key === "torus" ? 12 : 34,
    ...overrides,
  });
  return shape ? withHoleMode(shape, true) : null;
}

function automationNormalGroupedObject(overrides: Partial<WorkplaneShape> = {}) {
  const cube = automationShape("cube", { id: "normal-group-cube", x: -9, width: 18, depth: 24, height: 26 });
  const cylinder = automationShape("cylinder", { id: "normal-group-cylinder", x: 10, width: 20, depth: 20, height: 28 });
  if (!cube || !cylinder) {
    return null;
  }
  const group = groupedShape([cube, cylinder]);
  return group ? { ...group, id: "normal-group", name: "Normal grouped object", ...overrides } : null;
}

function automationSelectionOutlineRegressionShape() {
  const geometries: THREE.BufferGeometry[] = [
    new RoundedBoxGeometry(30, 20, 20, 8, 4).translate(-15, 10, 0),
    new THREE.BoxGeometry(16, 20, 20).translate(18, 10, 0),
  ];
  const positions: number[] = [];
  const normals: number[] = [];

  geometries.forEach((geometry) => {
    const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry;
    nonIndexed.computeVertexNormals();
    positions.push(...Array.from(nonIndexed.getAttribute("position").array as ArrayLike<number>));
    normals.push(...Array.from(nonIndexed.getAttribute("normal").array as ArrayLike<number>));
    if (nonIndexed !== geometry) {
      nonIndexed.dispose();
    }
    geometry.dispose();
  });

  return canonicalizeShape(
    sceneShape({
      id: "selection-outline-regression",
      name: "Selection outline regression",
      kind: "mesh",
      color: "#d41721",
      x: 0,
      z: 0,
      width: 56,
      depth: 20,
      height: 20,
      size: 56,
      importedMesh: {
        positions,
        normals,
        baseWidth: 56,
        baseDepth: 20,
        baseHeight: 20,
        triangleCount: Math.floor(positions.length / 9),
        sourceFormat: "json",
      },
      groupedShapes: [
        sceneShape({ id: "rounded-child", name: "Rounded child", kind: "box", color: "#d41721", x: -15, width: 30, depth: 20, height: 20, radius: 4 }),
        sceneShape({ id: "box-child", name: "Box child", kind: "box", color: "#d41721", x: 18, width: 16, depth: 20, height: 20 }),
      ],
    }),
  );
}

function booleanAutomationDynamicScene(caseId: string): { label: string; shapes: WorkplaneShape[] } | null {
  const requestedKeys = Object.keys(booleanAutomationShapeConfigs).filter((key) => key !== "cube" && key !== "cylinder");
  const allNormalKeys = Object.keys(booleanAutomationShapeConfigs);

  for (const key of requestedKeys) {
    if (caseId === `${key}-rot-hole`) {
      const solid = automationShape(key);
      return solid
        ? {
            label: `${solid.name} + rotated hole cube`,
            shapes: [solid, automationHoleBox({ rotation: 32 })],
          }
        : null;
    }

    if (caseId === `${key}-hole-cube`) {
      const hole = automationHoleShape(key);
      return hole
        ? {
            label: `${hole.name} hole + solid cube`,
            shapes: [automationSolidBox({ width: 36, depth: 36, height: 30 }), hole],
          }
        : null;
    }

    if (caseId === `${key}-hole-stl`) {
      const hole = automationHoleShape(key);
      return hole
        ? {
            label: `${hole.name} hole + imported STL`,
            shapes: [automationImportedStlBox({ width: 36, depth: 36, height: 30 }), hole],
          }
        : null;
    }
  }

  for (const key of allNormalKeys) {
    if (caseId === `hole-stl-${key}`) {
      const solid = automationShape(key, { width: key === "text" ? 42 : undefined, depth: key === "text" ? 20 : undefined });
      return solid
        ? {
            label: `rotated hole STL + ${solid.name}`,
            shapes: [
              solid,
              automationHoleStlBox({
                id: `hole-stl-${key}`,
                rotation: 29,
                rotationZ: 8,
              }),
            ],
          }
        : null;
    }

    if (caseId === `straight-hole-stl-${key}`) {
      const solid = automationShape(key, { width: key === "text" ? 42 : undefined, depth: key === "text" ? 20 : undefined });
      return solid
        ? {
            label: `non-rotated hole STL + ${solid.name}`,
            shapes: [
              solid,
              automationHoleStlBox({
                id: `straight-hole-stl-${key}`,
                rotation: 0,
                rotationZ: 0,
              }),
            ],
          }
        : null;
    }
  }

  return null;
}

function booleanAutomationScene(caseId: string): { label: string; shapes: WorkplaneShape[] } | null {
  const rotatedHole = () => automationHoleBox({ rotation: 32 });
  if (caseId === "selection-outline-regression") {
    return {
      label: "segmented rounded mesh selection outline",
      shapes: [automationSelectionOutlineRegressionShape()],
    };
  }
  if (caseId === "locked-align-pair") {
    return {
      label: "locked alignment reference pair",
      shapes: [
        sceneShape({ id: "locked-anchor", name: "Locked cube", kind: "box", color: "#d41721", x: 24, z: 10, width: 20, depth: 20, height: 20, locked: true }),
        sceneShape({ id: "moving-cube", name: "Moving cube", kind: "box", color: "#ef7f1a", x: -24, z: -18, width: 12, depth: 12, height: 12 }),
      ],
    };
  }
  if (caseId === "normal-group") {
    const group = groupedShape([
      sceneShape({ id: "modifier-base", name: "Base", kind: "box", color: "#d41721", width: 54, depth: 38, height: 7 }),
      sceneShape({ id: "modifier-upright", name: "Upright", kind: "box", color: "#d41721", x: 8, width: 14, depth: 14, height: 40, elevation: 4 }),
      sceneShape({ id: "modifier-rail", name: "Rail", kind: "box", color: "#d41721", x: -7, z: 5, width: 32, depth: 10, height: 13, elevation: 4 }),
    ]);
    return group ? { label: "overlapping normal solid group", shapes: [group] } : null;
  }
  if (caseId === "straight-hole-stl-group") {
    const group = automationNormalGroupedObject();
    return group
      ? {
          label: "normal grouped object + non-rotated hole STL",
          shapes: [group, automationHoleStlBox({ id: "straight-hole-stl-group", width: 24, depth: 42 })],
        }
      : null;
  }
  if (caseId === "straight-hole-stl-mixed-group") {
    const group = automationNormalGroupedObject({ x: 12 });
    const cube = automationShape("cube", { id: "mixed-solid-cube", x: -14, width: 24, depth: 26, height: 28 });
    return group && cube
      ? {
          label: "cube + normal grouped object + non-rotated hole STL",
          shapes: [cube, group, automationHoleStlBox({ id: "straight-hole-stl-mixed-group", width: 48, depth: 42 })],
        }
      : null;
  }
  if (caseId === "raspi-stl-hole") {
    return {
      label: "Raspberry Pi-like STL + non-rotated hole cube",
      shapes: [
        automationRaspberryPiStl(),
        automationHoleBox({ id: "raspi-hole-cube", x: -2, z: 2, width: 18, depth: 56, height: 20, elevation: -2, rotation: 0, rotationZ: 0 }),
      ],
    };
  }
  if (caseId === "raspi-stl-rot-hole") {
    return {
      label: "Raspberry Pi-like STL + rotated hole cube",
      shapes: [
        automationRaspberryPiStl(),
        automationHoleBox({ id: "raspi-rot-hole-cube", x: -2, z: 2, width: 18, depth: 56, height: 20, elevation: -2, rotation: 28, rotationZ: 8 }),
      ],
    };
  }
  if (caseId === "raspi-stl-hole-stl") {
    return {
      label: "Raspberry Pi-like STL + non-rotated hole STL",
      shapes: [
        automationRaspberryPiStl(),
        automationHoleStlBox({ id: "raspi-hole-stl", x: -2, z: 2, width: 18, depth: 56, height: 20, elevation: -2, rotation: 0, rotationZ: 0 }),
      ],
    };
  }
  if (caseId === "raspi-stl-rot-hole-stl") {
    return {
      label: "Raspberry Pi-like STL + rotated hole STL",
      shapes: [
        automationRaspberryPiStl(),
        automationHoleStlBox({ id: "raspi-rot-hole-stl", x: -2, z: 2, width: 18, depth: 56, height: 20, elevation: -2, rotation: 28, rotationZ: 8 }),
      ],
    };
  }
  const cases: Record<string, { label: string; shapes: WorkplaneShape[] }> = {
    "cube-hole": {
      label: "solid cube + non-rotated hole cube",
      shapes: [automationSolidBox(), automationHoleBox()],
    },
    "cube-rot-hole": {
      label: "solid cube + rotated hole cube",
      shapes: [automationSolidBox(), rotatedHole()],
    },
    "stl-hole": {
      label: "STL + non-rotated hole cube",
      shapes: [automationImportedStlBox(), automationHoleBox()],
    },
    "stl-rot-hole": {
      label: "STL + rotated hole cube",
      shapes: [automationImportedStlBox(), rotatedHole()],
    },
    "rot-stl-hole": {
      label: "rotated STL + hole cube",
      shapes: [automationImportedStlBox({ rotation: 28, rotationZ: 8 }), automationHoleBox()],
    },
    "rot-stl-rot-hole": {
      label: "rotated STL + rotated hole cube",
      shapes: [automationImportedStlBox({ rotation: 28, rotationZ: 8 }), rotatedHole()],
    },
    "cylinder-rot-hole": {
      label: "cylinder + rotated hole cube",
      shapes: [automationSolidBox({ id: "solid-cylinder", name: "Cylinder", kind: "cylinder", color: "#d97813", sides: 48 }), rotatedHole()],
    },
    "sphere-rot-hole": {
      label: "sphere + rotated hole cube",
      shapes: [automationSolidBox({ id: "solid-sphere", name: "Sphere", kind: "sphere", color: "#0098c7", sides: 48 }), rotatedHole()],
    },
    "cone-rot-hole": {
      label: "cone + rotated hole cube",
      shapes: [
        automationSolidBox({ id: "solid-cone", name: "Cone", kind: "cone", color: "#6e2786", sides: 64, topRadius: 0, baseRadius: 14 }),
        rotatedHole(),
      ],
    },
    "pyramid-rot-hole": {
      label: "pyramid + rotated hole cube",
      shapes: [automationSolidBox({ id: "solid-pyramid", name: "Pyramid", kind: "pyramid", color: "#f2cf10", sides: 4 }), rotatedHole()],
    },
  };
  return cases[caseId] ?? booleanAutomationDynamicScene(caseId);
}

function sanitizeName(name: string) {
  return name.replace(/[^a-z0-9_-]+/gi, "_") || "shape";
}

function meshDataToCadTransfer(mesh: MeshData) {
  const positions = new Float32Array(mesh.vertices.length * 3);
  mesh.vertices.forEach((vertex, index) => positions.set(vertex, index * 3));
  const indices = new Uint32Array(mesh.faces.length * 3);
  mesh.faces.forEach((face, index) => indices.set(face, index * 3));
  return { positions, indices };
}

/**
 * An exact profile part for the CAD worker. The display mesh always goes along
 * as the yardstick the exact body is checked against; its triangles go along
 * as the fallback body only while the whole request stays within the limit
 * that has always applied to meshes - so anything that worked before still
 * has its old way through.
 */
function cadModifierProfileMeshPart(profile: CadModifierProfilePart, mesh: MeshData | undefined, sendMesh: boolean, hole: boolean): CadModifierMeshPart {
  const expected = mesh && mesh.faces.length > 0 ? cadProfileExpectation(mesh.vertices, mesh.faces) : undefined;
  return {
    profile: expected ? { ...profile, expected } : profile,
    ...(sendMesh && mesh ? meshDataToCadTransfer(mesh) : {}),
    hole,
  };
}

/** A thread's exact body for the worker, with the display mesh's bounds and volume to check it against and, when it fits, the mesh to fall back on. */
function cadModifierThreadMeshPart(thread: CadModifierThreadPart, mesh: MeshData | undefined, sendMesh: boolean, hole: boolean): CadModifierMeshPart {
  const expected = mesh && mesh.faces.length > 0 ? cadProfileExpectation(mesh.vertices, mesh.faces) : undefined;
  return {
    thread: expected ? { ...thread, expected } : thread,
    ...(sendMesh && mesh ? meshDataToCadTransfer(mesh) : {}),
    hole,
  };
}

/**
 * A spring's exact body for the worker, with the display mesh's bounds and
 * volume to check it against and, when it fits, the mesh to fall back on. The
 * mesh draws the wire as a polygon inside the round one - a tenth less volume
 * at the coarsest quality - so its volume is first taken up by that share.
 */
function cadModifierSpringMeshPart(spring: CadModifierSpringPart, mesh: MeshData | undefined, sendMesh: boolean, hole: boolean): CadModifierMeshPart {
  const drawn = mesh && mesh.faces.length > 0 ? cadProfileExpectation(mesh.vertices, mesh.faces) : undefined;
  const expected = drawn ? { bounds: drawn.bounds, volume: drawn.volume / spring.meshSectionShare } : undefined;
  return {
    spring: expected ? { ...spring, expected } : spring,
    ...(sendMesh && mesh ? meshDataToCadTransfer(mesh) : {}),
    hole,
  };
}

/** A helical gear's exact body for the worker, with the display mesh's bounds and volume to check it against and, when it fits, the mesh to fall back on. */
function cadModifierHelicalGearMeshPart(gear: CadModifierHelicalGearPart, mesh: MeshData | undefined, sendMesh: boolean, hole: boolean): CadModifierMeshPart {
  const expected = mesh && mesh.faces.length > 0 ? cadProfileExpectation(mesh.vertices, mesh.faces) : undefined;
  return {
    helicalGear: expected ? { ...gear, expected } : gear,
    ...(sendMesh && mesh ? meshDataToCadTransfer(mesh) : {}),
    hole,
  };
}

/** A STEP import's own body for the worker, with the display mesh's bounds and volume to check it against and, when it fits, the mesh to fall back on. */
function cadModifierImportedStepMeshPart(step: string, brepTransform: number[] | undefined, mesh: MeshData | undefined, sendMesh: boolean, hole: boolean): CadModifierMeshPart {
  return {
    step,
    brepTransform,
    expected: mesh && mesh.faces.length > 0 ? cadProfileExpectation(mesh.vertices, mesh.faces) : undefined,
    ...(sendMesh && mesh ? meshDataToCadTransfer(mesh) : {}),
    hole,
  };
}

function shapeFromCadMesh(
  source: WorkplaneShape,
  positions: Float32Array,
  normals: Float32Array,
  indices: Uint32Array,
  brep: string,
  deflection?: CadModifierDeflection,
): WorkplaneShape | null {
  if (positions.length < 9 || indices.length < 3) return null;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < positions.length; index += 3) {
    minX = Math.min(minX, positions[index]);
    minY = Math.min(minY, positions[index + 1]);
    minZ = Math.min(minZ, positions[index + 2]);
    maxX = Math.max(maxX, positions[index]);
    maxY = Math.max(maxY, positions[index + 1]);
    maxZ = Math.max(maxZ, positions[index + 2]);
  }
  if (![minX, minY, minZ, maxX, maxY, maxZ].every(Number.isFinite)) return null;
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const rawWidth = Math.max(MIN_SHAPE_DIMENSION, maxX - minX);
  const rawHeight = Math.max(MIN_SHAPE_DIMENSION, maxY - minY);
  const rawDepth = Math.max(MIN_SHAPE_DIMENSION, maxZ - minZ);
  const flattenedPositions: number[] = [];
  const flattenedNormals: number[] = [];
  for (let index = 0; index < indices.length; index += 1) {
    const vertex = indices[index] * 3;
    flattenedPositions.push(positions[vertex] - centerX, positions[vertex + 1] - minY, positions[vertex + 2] - centerZ);
    if (normals.length >= vertex + 3) flattenedNormals.push(normals[vertex], normals[vertex + 1], normals[vertex + 2]);
  }
  const width = cleanModelDimension(rawWidth);
  const height = cleanModelDimension(rawHeight);
  const depth = cleanModelDimension(rawDepth);
  return canonicalizeShape({
    ...source,
    kind: "mesh",
    x: cleanNearZero(centerX, 0.0005),
    z: cleanNearZero(centerZ, 0.0005),
    elevation: cleanNearZero(minY, 0.0005),
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
    radius: undefined,
    // The CAD result is already generated from the final tapered surface. Do
    // not carry the parametric taper fields onto this baked mesh or the viewport
    // and subsequent mesh exports will apply the deformation a second time.
    taperTopWidth: undefined,
    taperTopDepth: undefined,
    taperBottomWidth: undefined,
    taperBottomDepth: undefined,
    taperTopScale: undefined,
    taperBottomScale: undefined,
    importedMesh: {
      positions: flattenedPositions,
      normals: flattenedNormals.length === flattenedPositions.length ? flattenedNormals : undefined,
      baseWidth: rawWidth,
      baseDepth: rawDepth,
      baseHeight: rawHeight,
      triangleCount: Math.floor(indices.length / 3),
      sourceFormat: "json",
    },
    imagePlate: undefined,
    cadBrep: brep,
    cadMeshDeflection: deflection ?? source.cadMeshDeflection,
    cadBrepFrame: {
      x: cleanNearZero(centerX, 0.0005),
      z: cleanNearZero(centerZ, 0.0005),
      elevation: cleanNearZero(minY, 0.0005),
      width,
      depth,
      height,
    },
    cadPrimitiveFrame: undefined,
  });
}

function cadEdgeEndpoint(edge: CadModifierEdge, end: "start" | "end") {
  const offset = end === "start" ? 0 : edge.points.length - 3;
  return new THREE.Vector3(edge.points[offset], edge.points[offset + 1], edge.points[offset + 2]);
}

function cadEdgeTangentAt(edge: CadModifierEdge, endpoint: THREE.Vector3) {
  const start = cadEdgeEndpoint(edge, "start");
  const end = cadEdgeEndpoint(edge, "end");
  if (endpoint.distanceToSquared(start) <= endpoint.distanceToSquared(end)) {
    const next = new THREE.Vector3(edge.points[3], edge.points[4], edge.points[5]);
    return next.sub(start).normalize();
  }
  const offset = Math.max(0, edge.points.length - 6);
  const previous = new THREE.Vector3(edge.points[offset], edge.points[offset + 1], edge.points[offset + 2]);
  return previous.sub(end).normalize();
}

function tangentCadEdgeChain(edges: CadModifierEdge[], startId: number, allowedIds: Set<number>) {
  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));
  const selected = new Set<number>([startId]);
  const queue = [startId];
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  edges.forEach((edge) => {
    for (let index = 0; index + 2 < edge.points.length; index += 3) {
      minX = Math.min(minX, edge.points[index]);
      minY = Math.min(minY, edge.points[index + 1]);
      minZ = Math.min(minZ, edge.points[index + 2]);
      maxX = Math.max(maxX, edge.points[index]);
      maxY = Math.max(maxY, edge.points[index + 1]);
      maxZ = Math.max(maxZ, edge.points[index + 2]);
    }
  });
  const diagonal = [minX, minY, minZ, maxX, maxY, maxZ].every(Number.isFinite)
    ? Math.hypot(maxX - minX, maxY - minY, maxZ - minZ)
    : 1;
  const tolerance = Math.max(1e-6, Math.min(0.01, diagonal * 1e-5));
  while (queue.length > 0) {
    const id = queue.shift() as number;
    const edge = edgeById.get(id);
    if (!edge) continue;
    const endpoints = [cadEdgeEndpoint(edge, "start"), cadEdgeEndpoint(edge, "end")];
    edges.forEach((candidate) => {
      if (selected.has(candidate.id) || !allowedIds.has(candidate.id)) return;
      const candidateEndpoints = [cadEdgeEndpoint(candidate, "start"), cadEdgeEndpoint(candidate, "end")];
      const shared = endpoints.find((point) => candidateEndpoints.some((other) => point.distanceTo(other) <= tolerance));
      if (!shared) return;
      const a = cadEdgeTangentAt(edge, shared);
      const b = cadEdgeTangentAt(candidate, shared);
      const deviation = (Math.acos(Math.max(-1, Math.min(1, Math.abs(a.dot(b))))) * 180) / Math.PI;
      if (deviation <= 16) {
        selected.add(candidate.id);
        queue.push(candidate.id);
      }
    });
  }
  return [...selected];
}

function cadDisplayEdgesAfterTreatment(shape: WorkplaneShape, session: EdgeModifierSession) {
  const removed = new Set(session.selectedEdgeIds);
  const elevation = shape.elevation ?? 0;
  return session.edges
    .filter((edge) => {
      const effectiveAngle = Math.min(edge.angle, 180 - edge.angle);
      return edge.manifold
        && !edge.boundary
        && effectiveAngle + 1e-3 >= Math.max(session.sharpAngle, NORMAL_SELECTION_CAD_EDGE_MIN_ANGLE)
        && !removed.has(edge.id);
    })
    .map((edge) => ({
      points: edge.points.map((value, index) => {
        if (index % 3 === 0) return value - shape.x;
        if (index % 3 === 1) return value - elevation;
        return value - shape.z;
      }),
    }));
}

function cadDisplayEdgesForShape(shape: WorkplaneShape, edges: CadModifierDisplayEdge[]) {
  const elevation = shape.elevation ?? 0;
  return edges
    .filter((edge) => edge.points.length >= 6)
    .map((edge) => ({
      points: edge.points.map((value, index) => {
        if (index % 3 === 0) return value - shape.x;
        if (index % 3 === 1) return value - elevation;
        return value - shape.z;
      }),
    }));
}

function cadModifierComponentPreviews(sourceParts: WorkplaneShape[], components: CadModifierComponentMesh[] | undefined, deflection?: CadModifierDeflection): EdgeModifierComponentPreview[] {
  if (!components?.length) return [];
  const previews: EdgeModifierComponentPreview[] = [];
  components.forEach((component) => {
    const source = sourceParts[component.owner] ?? sourceParts[0];
    if (!source) return;
    const shape = shapeFromCadMesh(source, component.positions, component.normals, component.indices, component.brep, deflection);
    if (!shape) return;
    previews.push({
      owner: component.owner,
      shape: canonicalizeShape({
        ...shape,
        cadDisplayEdges: cadDisplayEdgesForShape(shape, component.displayEdges),
        cadDisplayEdgesVersion: 2 as const,
      }),
    });
  });
  return previews;
}

function bedOverhangMessage(overhangs: BedOverhang[], printer: string) {
  if (overhangs.length > 1) return t("status.bedOverhangMany", { count: overhangs.length, printer });
  const [overhang] = overhangs;
  const mm = (value: number) => Number(value.toFixed(1));
  const sides = (["left", "right", "back", "front", "top"] as const)
    .filter((side) => overhang[side] > 0.01)
    .map((side) => t(`bed.side.${side}`, { mm: mm(overhang[side]) }))
    .join(", ");
  return t("status.bedOverhangOne", { name: displayShapeName(overhang.shape), printer, sides });
}

function edgeTreatmentLabel(feature: NonNullable<WorkplaneShape["edgeTreatments"]>[number]) {
  const size = `${Number(feature.amount.toFixed(2))} mm`;
  if (feature.kind === "shell") return `hollow (${size} walls, open ${shellOpenSides(feature.openings).join(" + ") || "none"})`;
  return `${feature.kind === "fillet" ? "fillet" : "chamfer"} (${size}, ${feature.edgeCount} edge${feature.edgeCount === 1 ? "" : "s"})`;
}

function shapeWithEdgeTreatmentRecord(
  shape: WorkplaneShape,
  before: WorkplaneShape,
  feature: NonNullable<WorkplaneShape["edgeTreatments"]>[number],
  preserveEdgeSize: boolean,
  createdAt: number,
) {
  return canonicalizeShape({
    ...shape,
    edgeResizeMode: preserveEdgeSize ? "preserve" : "scale",
    edgeTreatments: [
      ...(before.edgeTreatments ?? []),
      {
        ...feature,
      },
    ],
    edgeTreatmentHistory: [
      ...compactEdgeTreatmentHistory(before.edgeTreatmentHistory),
      {
        id: createLocalId("edge-history"),
        createdAt,
        feature,
        before: cloneWorkplaneShapeSnapshot(before),
        appliedFrame: edgeTreatmentAppliedFrame(shape),
      },
    ],
  });
}

function bakedEdgeTreatmentPreview(shape: WorkplaneShape, base: WorkplaneShape) {
  if (!base.groupedShapes?.length) return shape;
  return canonicalizeShape({
    ...shape,
    groupedShapes: undefined,
    groupedBaseWidth: undefined,
    groupedBaseDepth: undefined,
    groupedBaseHeight: undefined,
  });
}

type ShapeTransformSnapshot = {
  x: number;
  z: number;
  elevation: number;
  rotationQuaternion: THREE.Quaternion;
};

/**
 * Die Drehung backt bei fast jeder Form sofort ins Netz - danach steht
 * `shape.rotation` wieder auf 0, obwohl sich der Koerper sichtbar gedreht
 * hat. Die tatsaechlich seit der Entstehung aufgelaufene Drehung steckt dann
 * in `parametricSource` (`quaternionForShape`/`rotationFromQuaternion`, siehe
 * [[layerling-drehen-backt]]) - nur Text und Gruppen fuehren sie weiter im
 * eigenen Feld. Diese Quelle liefert in beiden Faellen dieselbe, vergleichbare
 * Drehung.
 */
function shapeTransformSnapshot(shape: WorkplaneShape): ShapeTransformSnapshot {
  return {
    x: shape.x,
    z: shape.z,
    elevation: shape.elevation ?? 0,
    rotationQuaternion: quaternionForShape(shape.parametricSource ?? shape),
  };
}

type ShapeMoveDelta = {
  dx: number;
  dz: number;
  delevation: number;
  rotationDelta: THREE.Quaternion;
};

const ZERO_MOVE_DELTA: ShapeMoveDelta = { dx: 0, dz: 0, delevation: 0, rotationDelta: new THREE.Quaternion() };

function shapeMoveDeltaBetween(from: ShapeTransformSnapshot, to: ShapeTransformSnapshot): ShapeMoveDelta {
  return {
    dx: to.x - from.x,
    dz: to.z - from.z,
    delevation: to.elevation - from.elevation,
    rotationDelta: to.rotationQuaternion.clone().multiply(from.rotationQuaternion.clone().invert()),
  };
}

function isZeroMoveDelta(delta: ShapeMoveDelta) {
  const epsilon = 1e-6;
  return Math.abs(delta.dx) < epsilon && Math.abs(delta.dz) < epsilon && Math.abs(delta.delevation) < epsilon
    && 1 - Math.abs(delta.rotationDelta.w) < epsilon;
}

/**
 * Verschiebt und dreht eine Kopie um denselben Betrag, den ihre Vorlage seit
 * ihrer eigenen Entstehung erfahren hat. Die Verschiebung ist ein einfaches
 * Feld-Update; die Drehung nicht, weil sie bei den meisten Formen sofort
 * backt (siehe `shapeTransformSnapshot` oben). Bei Text und Gruppen bleibt
 * die Drehung ein Feld und wird direkt weitergeschrieben. Bei allem anderen
 * wird der Zuwachs als neue Drehung eingetragen und derselbe Weg benutzt, der
 * auch einen echten Zieh-Griff backt (`bakeShapeTransformIntoMesh`) - so trifft
 * die Drehung wirklich die Netz-Eckpunkte der Kopie, nicht nur ein Feld, das
 * ohnehin gleich wieder auf 0 zurueckfiele.
 */
function applyShapeMoveDelta(shape: WorkplaneShape, delta: ShapeMoveDelta): WorkplaneShape {
  const moved: WorkplaneShape = {
    ...shape,
    x: shape.x + delta.dx,
    z: shape.z + delta.dz,
    elevation: (shape.elevation ?? 0) + delta.delevation,
  };
  if (isZeroMoveDelta({ ...ZERO_MOVE_DELTA, rotationDelta: delta.rotationDelta })) {
    return moved;
  }
  if (shapeTransformShouldRemainEditable(moved)) {
    return { ...moved, ...rotationFromQuaternion(delta.rotationDelta.clone().multiply(quaternionForShape(moved))) };
  }
  return bakeShapeTransformIntoMesh({ ...moved, ...rotationFromQuaternion(delta.rotationDelta) });
}

function shapeCenterDistance(a: WorkplaneShape, b: WorkplaneShape) {
  const ax = a.x;
  const ay = (a.elevation ?? 0) + a.height / 2;
  const az = a.z;
  const bx = b.x;
  const by = (b.elevation ?? 0) + b.height / 2;
  const bz = b.z;
  return Math.hypot(ax - bx, ay - by, az - bz);
}

function shapeDimensionDistance(a: WorkplaneShape, b: WorkplaneShape) {
  return Math.hypot(shapeWidth(a) - shapeWidth(b), a.height - b.height, shapeDepth(a) - shapeDepth(b));
}

function matchCadComponentsToSources(sourceParts: WorkplaneShape[], componentPreviews: EdgeModifierComponentPreview[]) {
  const candidates = componentPreviews.flatMap((component, componentIndex) =>
    sourceParts.map((source, sourceIndex) => ({
      component,
      componentIndex,
      sourceIndex,
      score: shapeCenterDistance(component.shape, source) + shapeDimensionDistance(component.shape, source) * 0.25,
    })),
  );
  candidates.sort((a, b) => a.score - b.score);

  const usedComponents = new Set<number>();
  const usedSources = new Set<number>();
  const ownerToSourceIndex = new Map<number, number>();
  candidates.forEach((candidate) => {
    if (usedComponents.has(candidate.componentIndex) || usedSources.has(candidate.sourceIndex)) return;
    usedComponents.add(candidate.componentIndex);
    usedSources.add(candidate.sourceIndex);
    ownerToSourceIndex.set(candidate.component.owner, candidate.sourceIndex);
  });
  return ownerToSourceIndex;
}

function groupedShapeWithComponentEdgeTreatment(
  base: WorkplaneShape,
  preview: WorkplaneShape,
  sourceParts: WorkplaneShape[],
  session: EdgeModifierSession,
  feature: NonNullable<WorkplaneShape["edgeTreatments"]>[number],
  createdAt: number,
) {
  if (
    !base.groupedShapes?.length ||
    // A tapered or twisted/leaned group is sent to CAD as one baked final mesh
    // because the parent deformation cannot be represented by its undeformed
    // child primitives. Keep the treated result flattened instead of
    // rebuilding a nested group that would reintroduce the old pre-deform
    // children.
    shapeHasShapeDeform(base) ||
    !hasOneToOneCadComponentMapping(sourceParts.length, session.componentPreviews.map((component) => component.owner))
  ) {
    return null;
  }

  const edgeById = new Map(session.edges.map((edge) => [edge.id, edge]));
  const ownerEdgeCounts = new Map<number, number>();
  session.selectedEdgeIds.forEach((edgeId) => {
    const owner = edgeById.get(edgeId)?.owner;
    if (typeof owner !== "number") return;
    ownerEdgeCounts.set(owner, (ownerEdgeCounts.get(owner) ?? 0) + 1);
  });
  if (ownerEdgeCounts.size === 0) {
    return null;
  }

  const ownerToSourceIndex = matchCadComponentsToSources(sourceParts, session.componentPreviews);
  if (ownerToSourceIndex.size !== sourceParts.length) {
    return null;
  }
  const componentByOwner = new Map(session.componentPreviews.map((component) => [component.owner, component]));
  const updatedSources = [...sourceParts];
  let changed = false;

  ownerEdgeCounts.forEach((edgeCount, owner) => {
    const sourceIndex = ownerToSourceIndex.get(owner);
    const component = componentByOwner.get(owner);
    if (sourceIndex === undefined || !component) return;
    const source = sourceParts[sourceIndex];
    const ownerFeature = { ...feature, edgeCount };
    const retargeted = canonicalizeShape({
      ...component.shape,
      id: source.id,
      name: source.name,
      color: source.color,
      hole: source.hole || undefined,
      locked: source.locked,
      hidden: source.hidden,
      groupedShapes: source.groupedShapes,
      groupedBaseWidth: source.groupedBaseWidth,
      groupedBaseDepth: source.groupedBaseDepth,
      groupedBaseHeight: source.groupedBaseHeight,
    });
    updatedSources[sourceIndex] = shapeWithEdgeTreatmentRecord(retargeted, source, ownerFeature, session.preserveEdgeSize, createdAt);
    changed = true;
  });

  if (!changed) {
    return null;
  }

  const elevation = preview.elevation ?? 0;
  return canonicalizeShape({
    ...preview,
    edgeResizeMode: session.preserveEdgeSize ? "preserve" : "scale",
    edgeTreatments: base.edgeTreatments,
    edgeTreatmentHistory: base.edgeTreatmentHistory?.length ? compactEdgeTreatmentHistory(base.edgeTreatmentHistory) : undefined,
    groupedBaseWidth: shapeWidth(preview),
    groupedBaseDepth: shapeDepth(preview),
    groupedBaseHeight: preview.height,
    groupedShapes: updatedSources.map((shape) => cloneAsGroupChild(shape, preview.x, preview.z, elevation)),
  });
}

function edgeTreatmentFeatureCount(shape: WorkplaneShape): number {
  return (shape.edgeTreatments?.length ?? 0) + (shape.groupedShapes?.reduce((total, child) => total + edgeTreatmentFeatureCount(child), 0) ?? 0);
}

function reversibleEdgeTreatmentCount(shape: WorkplaneShape): number {
  return (shape.edgeTreatmentHistory?.length ?? 0) + (shape.groupedShapes?.reduce((total, child) => total + reversibleEdgeTreatmentCount(child), 0) ?? 0);
}

function edgeTreatmentHistoryOptions(shape: WorkplaneShape, path: number[] = [], targetName = shape.name): EdgeFeatureRevertOption[] {
  const ownHistory = shape.edgeTreatmentHistory ?? [];
  const ownOptions = ownHistory.map((entry, index) => ({
    id: `${path.length ? path.join(".") : "root"}:${entry.id}`,
    entryId: entry.id,
    path,
    label: edgeTreatmentLabel(entry.feature),
    kind: entry.feature.kind,
    amount: entry.feature.amount,
    edgeCount: entry.feature.edgeCount,
    targetName,
    createdAt: entry.createdAt,
    removesNewerCount: Math.max(0, ownHistory.length - index - 1),
  }));
  const childOptions = (shape.groupedShapes ?? []).flatMap((child, index) =>
    edgeTreatmentHistoryOptions(child, [...path, index], `${targetName} / ${child.name}`),
  );
  return [...ownOptions, ...childOptions].sort((a, b) => b.createdAt - a.createdAt);
}

function restoreOwnLastEdgeTreatment(shape: WorkplaneShape, entry: NonNullable<WorkplaneShape["edgeTreatmentHistory"]>[number]) {
  return restoreShapeBeforeEdgeTreatment(shape, entry);
}

async function restoreEdgeTreatmentInShape(shape: WorkplaneShape, path: number[], entryId: string, triangleLimit: number): Promise<{ shape: WorkplaneShape; label: string } | null> {
  if (path.length === 0) {
    const entry = (shape.edgeTreatmentHistory ?? []).find((candidate) => candidate.id === entryId);
    return entry ? { shape: restoreOwnLastEdgeTreatment(shape, entry), label: edgeTreatmentLabel(entry.feature) } : null;
  }

  if (!shape.groupedShapes?.length) {
    return null;
  }

  const [childIndex, ...restPath] = path;
  const restoredChildren = restoreGroupedChildren(shape);
  const child = restoredChildren[childIndex];
  if (!child) {
    return null;
  }
  const restoredChild = await restoreEdgeTreatmentInShape(child, restPath, entryId, triangleLimit);
  if (!restoredChild) {
    return null;
  }

  restoredChildren[childIndex] = restoredChild.shape;
  const rebuilt = await buildGroupedShapeFromSelection(restoredChildren, triangleLimit);
  if (!rebuilt.group) {
    return null;
  }

  return {
    shape: canonicalizeShape({
      ...rebuilt.group,
      id: shape.id,
      name: shape.name,
      color: shape.color,
      hole: shape.hole || rebuilt.group.hole,
      locked: shape.locked,
      hidden: shape.hidden,
      edgeResizeMode: shape.edgeResizeMode,
      groupOperation: shape.groupOperation,
      edgeTreatments: shape.edgeTreatments,
      edgeTreatmentHistory: shape.edgeTreatmentHistory?.length ? compactEdgeTreatmentHistory(shape.edgeTreatmentHistory) : undefined,
    }),
    label: restoredChild.label,
  };
}

function transformMesh(mesh: MeshData, shape: WorkplaneShape): MeshData {
  const centerY = shape.height / 2;
  const tapered = shapeHasTaper(shape);
  const deformed = shapeHasExtrudeDeform(shape);
  let minLocalY = 0;
  let maxLocalY = 1;
  // Taper and twist work towards the middle of the mesh's extent, as the
  // viewport does; a star or a heart is not centred on its origin.
  let deformCenterX = 0;
  let deformCenterZ = 0;
  if ((tapered || deformed) && mesh.vertices.length) {
    minLocalY = Number.POSITIVE_INFINITY;
    maxLocalY = Number.NEGATIVE_INFINITY;
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minZ = Number.POSITIVE_INFINITY;
    let maxZ = Number.NEGATIVE_INFINITY;
    mesh.vertices.forEach((vertex) => {
      minLocalY = Math.min(minLocalY, vertex[1]);
      maxLocalY = Math.max(maxLocalY, vertex[1]);
      minX = Math.min(minX, vertex[0]);
      maxX = Math.max(maxX, vertex[0]);
      minZ = Math.min(minZ, vertex[2]);
      maxZ = Math.max(maxZ, vertex[2]);
    });
    deformCenterX = (minX + maxX) / 2;
    deformCenterZ = (minZ + maxZ) / 2;
  }
  const taperHeight = Math.max(1e-6, maxLocalY - minLocalY);
  // A twist needs vertices partway up to turn: cut the mesh into bands first, as the viewport does (#184).
  const bands = deformed ? twistBandCount(shape.extrudeTwist ?? 0) : 1;
  if (bands > 1 && mesh.vertices.length) {
    const sliced = meshForTwist(mesh.vertices as Vec3[], mesh.faces as Array<[number, number, number]>, minLocalY, maxLocalY, shape.extrudeTwist ?? 0);
    mesh = { ...mesh, vertices: sliced.vertices, faces: sliced.faces };
  }
  const matrix = new THREE.Matrix4().makeRotationFromEuler(
    new THREE.Euler(
      THREE.MathUtils.degToRad(shape.rotationX ?? 0),
      THREE.MathUtils.degToRad(meshYawDegrees(shape)),
      THREE.MathUtils.degToRad(shape.rotationZ ?? 0),
      "XYZ",
    ),
  );
  const mirrorX = mirrorSign(shape.mirrorX);
  const mirrorY = mirrorSign(shape.mirrorY);
  const mirrorZ = mirrorSign(shape.mirrorZ);
  const reversedWinding = mirroredAxisCount(shape) % 2 === 1;
  return {
    ...mesh,
    vertices: mesh.vertices.map(([x, y, z]) => {
      const normalizedHeight = (y - minLocalY) / taperHeight;
      const widthScale = tapered ? shapeTaperScaleAt(shape, normalizedHeight, "width") : 1;
      const depthScale = tapered ? shapeTaperScaleAt(shape, normalizedHeight, "depth") : 1;
      let localX = (x - deformCenterX) * widthScale;
      let localZ = (z - deformCenterZ) * depthScale;
      if (deformed) {
        const deform = shapeExtrudeDeformAt(shape, normalizedHeight);
        const cos = Math.cos(deform.twistRadians);
        const sin = Math.sin(deform.twistRadians);
        const twistedX = localX * cos - localZ * sin;
        const twistedZ = localX * sin + localZ * cos;
        localX = twistedX + deform.offsetX;
        localZ = twistedZ + deform.offsetZ;
      }
      localX += deformCenterX;
      localZ += deformCenterZ;
      const vertex = new THREE.Vector3(localX * mirrorX, (y - centerY) * mirrorY, localZ * mirrorZ).applyMatrix4(matrix);
      return [vertex.x + shape.x, vertex.y + (shape.elevation ?? 0) + centerY, vertex.z + shape.z] as Vec3;
    }),
    faces: reversedWinding ? mesh.faces.map(([a, b, c]) => [a, c, b] as [number, number, number]) : mesh.faces,
  };
}

function boxMesh(shape: WorkplaneShape): MeshData {
  const width = shapeWidth(shape);
  const depth = shapeDepth(shape);
  const height = shape.height;
  const x = width / 2;
  const z = depth / 2;
  return {
    name: sanitizeName(shape.name),
    vertices: [
      [-x, 0, -z],
      [x, 0, -z],
      [x, 0, z],
      [-x, 0, z],
      [-x, height, -z],
      [x, height, -z],
      [x, height, z],
      [-x, height, z],
    ],
    faces: [
      [0, 2, 1],
      [0, 3, 2],
      [4, 5, 6],
      [4, 6, 7],
      [0, 1, 5],
      [0, 5, 4],
      [1, 2, 6],
      [1, 6, 5],
      [2, 3, 7],
      [2, 7, 6],
      [3, 0, 4],
      [3, 4, 7],
    ],
  };
}

function cylinderMesh(shape: WorkplaneShape, sides = 96, topRadiusScale = 1): MeshData {
  const width = shapeWidth(shape);
  const depth = shapeDepth(shape);
  const height = shape.height;
  const vertices: Vec3[] = [[0, 0, 0], [0, height, 0]];
  for (let i = 0; i < sides; i += 1) {
    const angle = (i / sides) * Math.PI * 2;
    vertices.push([(Math.cos(angle) * width) / 2, 0, (Math.sin(angle) * depth) / 2]);
    vertices.push([(Math.cos(angle) * width * topRadiusScale) / 2, height, (Math.sin(angle) * depth * topRadiusScale) / 2]);
  }
  const faces: [number, number, number][] = [];
  for (let i = 0; i < sides; i += 1) {
    const next = (i + 1) % sides;
    const b0 = 2 + i * 2;
    const t0 = b0 + 1;
    const b1 = 2 + next * 2;
    const t1 = b1 + 1;
    faces.push([0, b1, b0]);
    if (topRadiusScale > 0) {
      faces.push([1, t0, t1]);
      faces.push([b0, b1, t1], [b0, t1, t0]);
    } else {
      faces.push([b0, b1, t0]);
    }
  }
  return { name: sanitizeName(shape.name), vertices, faces };
}

function sphereMesh(shape: WorkplaneShape): MeshData {
  const { widthSegments: lon, heightSegments: lat } = sphereTessellation(shape.steps);
  const width = shapeWidth(shape);
  const depth = shapeDepth(shape);
  const height = shape.height;
  const vertices: Vec3[] = [];
  for (let yStep = 0; yStep <= lat; yStep += 1) {
    const theta = (yStep / lat) * Math.PI;
    const y = height / 2 + Math.cos(theta) * (height / 2);
    const ring = Math.sin(theta);
    for (let xStep = 0; xStep < lon; xStep += 1) {
      const phi = (xStep / lon) * Math.PI * 2;
      vertices.push([(Math.cos(phi) * width * ring) / 2, y, (Math.sin(phi) * depth * ring) / 2]);
    }
  }
  const faces: [number, number, number][] = [];
  for (let yStep = 0; yStep < lat; yStep += 1) {
    for (let xStep = 0; xStep < lon; xStep += 1) {
      const next = (xStep + 1) % lon;
      const a = yStep * lon + xStep;
      const b = yStep * lon + next;
      const c = (yStep + 1) * lon + next;
      const d = (yStep + 1) * lon + xStep;
      faces.push([a, d, c], [a, c, b]);
    }
  }
  return { name: sanitizeName(shape.name), vertices, faces };
}

function bufferGeometryToMeshData(name: string, geometry: THREE.BufferGeometry): MeshData {
  const prepared = geometry.index ? geometry.toNonIndexed() : geometry;
  prepared.computeVertexNormals();
  prepared.computeBoundingBox();
  const minY = prepared.boundingBox?.min.y ?? 0;
  if (Math.abs(minY) > 0.000001) {
    prepared.translate(0, -minY, 0);
    prepared.computeBoundingBox();
  }

  const position = prepared.getAttribute("position");
  const vertices: Vec3[] = [];
  const faces: [number, number, number][] = [];
  for (let i = 0; i < position.count; i += 1) {
    vertices.push([position.getX(i), position.getY(i), position.getZ(i)]);
  }
  for (let i = 0; i + 2 < position.count; i += 3) {
    faces.push([i, i + 1, i + 2]);
  }

  if (prepared !== geometry) {
    prepared.dispose();
  }
  geometry.dispose();
  return { name, vertices, faces };
}

function createBooleanRoofGeometry(width: number, height: number, depth: number) {
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
  return geometry;
}

function createBooleanWedgeGeometry(width: number, height: number, depth: number) {
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
  return geometry;
}

function createBooleanTorusGeometry(width: number, height: number, depth: number) {
  const tubeRadius = Math.max(0.1, height / 2);
  const majorRadius = Math.max(0.2, Math.min(width, depth) / 2 - tubeRadius);
  const geometry = new THREE.TorusGeometry(majorRadius, tubeRadius, 36, 144);
  geometry.rotateX(Math.PI / 2);
  const outerDiameter = (majorRadius + tubeRadius) * 2;
  geometry.scale(width / Math.max(0.001, outerDiameter), 1, depth / Math.max(0.001, outerDiameter));
  return geometry;
}

function createBooleanTextGeometry(shape: WorkplaneShape) {
  return textDisplayGeometry(shape);
}

function geometryMeshForShape(shape: WorkplaneShape): MeshData | null {
  const width = shapeWidth(shape);
  const depth = shapeDepth(shape);
  const height = shape.height;
  const size = Math.min(width, depth);
  let geometry: THREE.BufferGeometry | null = null;

  switch (shape.kind) {
    case "box":
      geometry = shape.radius && shape.radius > 0
        ? new RoundedBoxGeometry(width, height, depth, Math.max(1, shape.steps ?? 10), shape.radius)
        : new THREE.BoxGeometry(width, height, depth);
      break;
    case "ruler":
      // Reines Messwerkzeug, keine echte Formgeometrie - derselbe schlichte
      // Quader wie im Live-Viewport (WorkplaneViewport.tsx, case "ruler"),
      // nur ohne die Tick-Textur, die hier fuer Backen/Export nicht gebraucht
      // wird. Fehlte dieser Fall, fiel ein bei 45 Grad gebackenes Lineal auf
      // die falsche "sketch"-Ersatzgeometrie zurueck (Forum: kaputtes Netz
      // nach schraeger Drehung).
      geometry = new THREE.BoxGeometry(width, height, depth);
      break;
    case "cylinder":
    case "ellipse":
      geometry = createPrismGeometry(width, height, depth, roundSideCount(shape.sides, width, depth), shape.segments ?? 1);
      break;
    case "sphere":
      geometry = new THREE.SphereGeometry(1, sphereTessellation(shape.steps).widthSegments, sphereTessellation(shape.steps).heightSegments);
      geometry.scale(width / 2, height / 2, depth / 2);
      break;
    case "cone": {
      const baseRadius = shape.baseRadius ?? width / 2;
      geometry = new THREE.CylinderGeometry(shape.topRadius ?? 0, baseRadius, height, roundSideCount(shape.sides, width, depth));
      geometry.scale(1, 1, depth / Math.max(0.001, width));
      break;
    }
    case "pyramid":
      geometry = createPyramidGeometry(width, height, depth, shape.sides ?? 4, shape.topWidth, shape.topDepth);
      break;
    case "roof":
      geometry = createBooleanRoofGeometry(width, height, depth);
      break;
    case "roundRoof":
      geometry = createBooleanRoundRoofGeometry(width, height, depth, shape.sides ?? 64);
      break;
    case "halfSphere":
      geometry = createBooleanHalfSphereGeometry(width, height, depth, shape.steps ?? 32);
      break;
    case "torus":
      geometry = createBooleanTorusGeometry(width, height, depth);
      break;
    case "ring":
    case "tube":
      geometry = createBooleanHollowCylinderGeometry(width, height, depth, shape.bevel ?? 4, roundSideCount(shape.sides, width, depth));
      break;
    case "star":
      geometry = createStarGeometry({
        width,
        depth,
        height,
        starPoints: shape.starPoints,
        starInnerSize: shape.starInnerSize,
        starOuterFillet: shape.starOuterFillet,
        starInnerFillet: shape.starInnerFillet,
        starQuality: shape.starQuality,
      });
      break;
    case "heart":
      geometry = createHeartGeometry({
        width,
        depth,
        height,
        heartTipFillet: shape.heartTipFillet,
        heartQuality: shape.heartQuality,
      });
      break;
    case "crescent":
      geometry = createCrescentGeometry({
        width,
        depth,
        height,
        crescentThickness: shape.crescentThickness,
        crescentTipFillet: shape.crescentTipFillet,
        crescentQuality: shape.crescentQuality,
      });
      break;
    case "slot":
      geometry = createSlotGeometry({
        width,
        depth,
        height,
        sides: shape.sides,
        slotEndRatio: shape.slotEndRatio,
      });
      break;
    case "counterbore":
    case "countersink":
      geometry = createScrewHoleGeometry({ kind: shape.kind, width, depth, height, screwHoleShaft: shape.screwHoleShaft, screwHoleHeadDepth: shape.screwHoleHeadDepth, screwHoleAngle: shape.screwHoleAngle, sides: roundSideCount(shape.sides, width, depth) });
      break;
    case "teardrop":
      geometry = createTeardropGeometry({ width, depth, height, sides: roundSideCount(shape.sides, width, depth) });
      break;
    case "knurl":
      geometry = createKnurlGeometry({ width, height, knurlPattern: shape.knurlPattern, knurlCount: shape.knurlCount, knurlDepth: shape.knurlDepth, knurlAngle: shape.knurlAngle, knurlChamfer: shape.knurlChamfer });
      break;
    case "hinge":
      geometry = createHingeGeometry({
        width,
        depth,
        height,
        hingeKnuckles: shape.hingeKnuckles,
        hingePinDiameter: shape.hingePinDiameter,
        hingeLeafThickness: shape.hingeLeafThickness,
        hingeClearance: shape.hingeClearance,
        sides: shape.sides,
      });
      break;
    case "loft":
      geometry = createLoftGeometry({ ...shape, width, depth, height });
      break;
    case "dovetail":
      geometry = createDovetailGeometry({
        width,
        depth,
        height,
        dovetailNeckWidth: shape.dovetailNeckWidth,
        dovetailClearance: shape.dovetailClearance,
        hole: shape.hole,
      });
      break;
    case "gear":
      geometry = createGearGeometry({
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
      });
      break;
    case "honeycomb":
      geometry = createHoneycombGeometry({
        width,
        depth,
        height,
        honeycombCellSize: shape.honeycombCellSize,
        honeycombWallThickness: shape.honeycombWallThickness,
        honeycombFrameWidth: shape.honeycombFrameWidth,
      });
      break;
    case "bentTube":
      geometry = createBentTubeGeometry({
        width,
        depth,
        height,
        bentTubeProfile: shape.bentTubeProfile,
        bentTubeInnerProfile: shape.bentTubeInnerProfile,
        bentTubeSize: shape.bentTubeSize,
        bentTubeWall: shape.bentTubeWall,
        bentTubeQuality: shape.bentTubeQuality,
        bentTubeSegments: shape.bentTubeSegments,
      });
      break;
    case "roundedBox":
      geometry = createRoundedBoxGeometry({
        width,
        depth,
        height,
        cornerFillet: shape.cornerFillet,
        topBottomFillet: shape.topBottomFillet,
        roundedBoxQuality: shape.roundedBoxQuality,
      });
      break;
    case "thread":
      geometry = createThreadGeometry({
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
      });
      break;
    case "spring":
      geometry = createSpringGeometry({
        width,
        depth,
        height,
        springTurns: shape.springTurns,
        springWire: shape.springWire,
        springHand: shape.springHand,
        springQuality: shape.springQuality,
      });
      break;
    case "wedge":
      geometry = createBooleanWedgeGeometry(width, height, depth);
      break;
    case "polygon":
      geometry = createPrismGeometry(width, height, depth, shape.sides ?? 6);
      break;
    case "icosahedron":
      geometry = new THREE.IcosahedronGeometry(size / 2, 1);
      geometry.translate(0, height / 2, 0);
      break;
    case "text":
      geometry = createBooleanTextGeometry(shape);
      break;
    case "scribble":
      geometry = new THREE.TorusKnotGeometry(size * 0.22, size * 0.055, 120, 12);
      geometry.translate(0, height / 2, 0);
      break;
    case "sketch":
    default:
      geometry = new THREE.BoxGeometry(size, Math.max(3, height * 0.35), size * 0.72);
      break;
  }

  return geometry ? bufferGeometryToMeshData(sanitizeName(shape.name), geometry) : null;
}

function meshForShape(shape: WorkplaneShape): MeshData {
  if (shape.kind === "mesh" && shape.importedMesh) {
    return importedMeshForShape(shape);
  }

  if (shape.groupedShapes?.length) {
    const vertices: Vec3[] = [];
    const faces: [number, number, number][] = [];
    shape.groupedShapes.filter((child) => !child.hidden).forEach((child) => {
      const childMesh = meshForShape(child);
      appendMeshData(vertices, faces, childMesh);
    });
    // Without the stretch, split, export and alignment would see a resized
    // group at the size it had when it was grouped.
    const scaled = scaleGroupedVertices(vertices, groupedContentScale(shape, localGroupBounds(shape.groupedShapes)));
    return transformMesh({ name: sanitizeName(shape.name), vertices: scaled, faces }, shape);
  }

  const raw =
    geometryMeshForShape(shape) ??
    (shape.kind === "cylinder" || shape.kind === "ellipse" || shape.kind === "tube" || shape.kind === "ring" || shape.kind === "torus"
      ? cylinderMesh(shape, shape.sides ?? 96)
      : shape.kind === "cone"
        ? cylinderMesh(shape, shape.sides ?? 96, shape.baseRadius ? (shape.topRadius ?? 0) / shape.baseRadius : 0)
        : shape.kind === "sphere" || shape.kind === "halfSphere"
          ? sphereMesh(shape)
          : shape.kind === "pyramid"
            ? cylinderMesh(shape, shape.sides ?? 4, 0)
            : boxMesh(shape));
  return transformMesh(raw, shape);
}

function sketchReferenceShapeOnWorkplane(shape: WorkplaneShape, workplane: PlacementWorkplane): WorkplaneShape {
  const mesh = meshForShape(shape);
  const projectedVertices = mesh.vertices.map(([x, y, z]) => {
    const local = placementWorkplaneCoordinates(workplane, { x, y, z });
    return { x: local.x, y: -local.y, z: local.z };
  });
  // A loop, not Math.min(...list): a large imported mesh has more points than a call takes
  // arguments, and the spread overflowed the stack when the design was opened (#190).
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (const vertex of projectedVertices) {
    if (vertex.x < minX) minX = vertex.x;
    if (vertex.x > maxX) maxX = vertex.x;
    if (vertex.y < minY) minY = vertex.y;
    if (vertex.y > maxY) maxY = vertex.y;
    if (vertex.z < minZ) minZ = vertex.z;
    if (vertex.z > maxZ) maxZ = vertex.z;
  }
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const positions = mesh.faces.flatMap(([a, b, c]) => [a, b, c].flatMap((index) => {
    const vertex = projectedVertices[index];
    return [vertex.x - centerX, vertex.y - centerY, vertex.z - centerZ];
  }));
  const width = Math.max(0.01, maxX - minX);
  const depth = Math.max(0.01, maxZ - minZ);
  const height = Math.max(0.01, maxY - minY);

  return canonicalizeShape({
    ...shape,
    kind: "mesh",
    x: centerX,
    z: centerZ,
    elevation: 0,
    size: Math.max(width, depth),
    width,
    depth,
    height,
    rotation: 0,
    rotationX: 0,
    rotationZ: 0,
    mirrorX: undefined,
    mirrorY: undefined,
    mirrorZ: undefined,
    importedMesh: {
      positions,
      baseWidth: width,
      baseDepth: depth,
      baseHeight: height,
      triangleCount: mesh.faces.length,
      sourceFormat: "json",
    },
    groupedShapes: undefined,
    edgeTreatments: undefined,
    edgeTreatmentHistory: undefined,
    cadDisplayEdges: undefined,
    cadBrep: undefined,
    cadBrepFrame: undefined,
    cadPrimitiveFrame: undefined,
  });
}

function appendMeshData(vertices: Vec3[], faces: [number, number, number][], mesh: MeshData) {
  const offset = vertices.length;
  for (let i = 0; i < mesh.vertices.length; i += 1) {
    vertices.push(mesh.vertices[i]);
  }
  for (let i = 0; i < mesh.faces.length; i += 1) {
    const [a, b, c] = mesh.faces[i];
    faces.push([a + offset, b + offset, c + offset]);
  }
}

function importedMeshForShape(shape: WorkplaneShape): MeshData {
  const mesh = shape.importedMesh;
  if (!mesh || mesh.positions.length < 9) {
    return transformMesh(boxMesh(shape), shape);
  }

  const resizedPositions = resizedImportedMeshPositions(shape);
  const vertices: Vec3[] = [];
  for (let i = 0; i < resizedPositions.length; i += 3) {
    vertices.push([resizedPositions[i], resizedPositions[i + 1], resizedPositions[i + 2]]);
  }

  const faces: [number, number, number][] = [];
  for (let i = 0; i + 2 < vertices.length; i += 3) {
    faces.push([i, i + 1, i + 2]);
  }

  return transformMesh({ name: sanitizeName(shape.name), vertices, faces }, shape);
}

function shapeHasTransformToBake(shape: WorkplaneShape) {
  return (
    Math.abs(cleanRotationDegrees(shape.rotation ?? 0, 3)) > 0 ||
    Math.abs(cleanRotationDegrees(shape.rotationX ?? 0, 3)) > 0 ||
    Math.abs(cleanRotationDegrees(shape.rotationZ ?? 0, 3)) > 0 ||
    Boolean(shape.mirrorX || shape.mirrorY || shape.mirrorZ)
  );
}

/** Tausender trennen, in der gerade eingestellten Sprache. */
function formatTriangleCount(count: number) {
  return count.toLocaleString(getLanguage() === "de" ? "de-DE" : "en-US");
}

function cadModifierPrimitiveForShape(shape: WorkplaneShape): CadModifierPrimitivePart | null {
  // Taper, twist and lean are all non-affine deformations, so an analytic
  // primitive or stored BREP cannot represent the final visible surface.
  // Send the baked mesh to the CAD worker instead so edge selection/treatment
  // matches the viewport exactly.
  if (shapeHasShapeDeform(shape)) return null;
  return cadModifierPrimitiveForBakedShape(shape)
    ?? cadModifierPrimitiveForAnalyticShape(shape);
}

/**
 * Beim Backen festhalten, was der Koerper war - sonst waere eine gedrehte
 * Mutter fuer immer ein Netz. Wer schon einmal gedreht wurde, behaelt seine
 * Urform; die neue Drehung kommt oben drauf, und verkettet wird ueber
 * Quaternionen, weil Eulerwinkel sich nicht addieren lassen.
 *
 * Eine Spiegelung wird **nicht** festgehalten: sie liesse sich nicht ehrlich
 * wieder auftragen - ein gespiegeltes Rechtsgewinde ist ein Linksgewinde, und
 * das waere ein anderer Koerper.
 */
function parametricSourceForBake(shape: WorkplaneShape): ParametricSource | undefined {
  if (shape.mirrorX || shape.mirrorY || shape.mirrorZ) return undefined;
  const bekannt = shape.parametricSource;
  if (bekannt) return { ...bekannt, ...composedShapeRotation(shape, bekannt) };
  if (shape.kind === "mesh" || shape.importedMesh || shape.groupedShapes?.length || shape.imagePlate) {
    return undefined;
  }
  return {
    kind: shape.kind,
    width: shapeWidth(shape),
    depth: shapeDepth(shape),
    height: shape.height,
    size: shape.size,
    rotation: shape.rotation,
    rotationX: shape.rotationX ?? 0,
    rotationZ: shape.rotationZ ?? 0,
    taperTopWidth: shape.taperTopWidth,
    taperTopDepth: shape.taperTopDepth,
    taperBottomWidth: shape.taperBottomWidth,
    taperBottomDepth: shape.taperBottomDepth,
    extrudeTwist: shape.extrudeTwist,
    extrudeTopOffsetX: shape.extrudeTopOffsetX,
    extrudeTopOffsetZ: shape.extrudeTopOffsetZ,
  };
}

/**
 * Der Rueckweg: Urform herstellen, die Aenderung einsetzen, wieder drehen,
 * wieder backen. Die Lage bleibt, wo der Anwender den Koerper zuletzt
 * hingestellt hat - das Backen rechnet sie aus dem Netz, aber verschoben
 * haben kann er ihn seither trotzdem.
 */
function rebuiltParametricShape(shape: WorkplaneShape, patch: Partial<WorkplaneShape>) {
  const source = shape.parametricSource;
  if (!source) return null;
  /*
   * Eine Drehung im selben Zug ist eine Drehung **auf** das gebackene Netz,
   * also kommt sie oben auf die schon aufgelaufene. Wer sie stattdessen
   * einsetzt, verliert alles Vorherige - dann liegt die Mutter wieder flach.
   */
  const { rotation, rotationX, rotationZ, ...bauwerte } = patch;
  const drehtMit = [rotation, rotationX, rotationZ].some((wert) => typeof wert === "number");
  const gesamt = drehtMit
    ? composedShapeRotation({ rotation: rotation ?? 0, rotationX: rotationX ?? 0, rotationZ: rotationZ ?? 0 }, source)
    : { rotation: source.rotation, rotationX: source.rotationX, rotationZ: source.rotationZ };
  const urform = canonicalizeShape({
    ...shape,
    kind: source.kind,
    width: source.width,
    depth: source.depth,
    height: source.height,
    size: source.size,
    taperTopWidth: source.taperTopWidth,
    taperTopDepth: source.taperTopDepth,
    taperBottomWidth: source.taperBottomWidth,
    taperBottomDepth: source.taperBottomDepth,
    extrudeTwist: source.extrudeTwist,
    extrudeTopOffsetX: source.extrudeTopOffsetX,
    extrudeTopOffsetZ: source.extrudeTopOffsetZ,
    importedMesh: undefined,
    parametricSource: undefined,
    rotation: 0,
    rotationX: 0,
    rotationZ: 0,
    ...bauwerte,
  });
  const gebacken = canonicalizeShape(bakeShapeTransformIntoMesh(canonicalizeShape({ ...urform, ...gesamt })));
  const targetX = patch.x ?? (drehtMit ? gebacken.x : shape.x);
  const targetZ = patch.z ?? (drehtMit ? gebacken.z : shape.z);
  const targetElevation = patch.elevation ?? (drehtMit ? gebacken.elevation : (shape.elevation ?? 0));
  return canonicalizeShape({
    ...gebacken,
    x: targetX,
    z: targetZ,
    elevation: targetElevation,
  });
}

function bakeShapeTransformIntoMesh(shape: WorkplaneShape): WorkplaneShape {
  // Text and groups must retain their editable source data across transforms.
  // Baking a group would discard groupedShapes and make Ungroup unavailable.
  if (shapeTransformShouldRemainEditable(shape) || !shapeHasTransformToBake(shape)) {
    return shape;
  }

  const mesh = meshForShape(shape);
  if (mesh.vertices.length < 3 || mesh.faces.length < 1) {
    return shape;
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  mesh.vertices.forEach(([x, y, z]) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  });

  if (![minX, minY, minZ, maxX, maxY, maxZ].every(Number.isFinite)) {
    return shape;
  }

  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const rawWidth = Math.max(MIN_SHAPE_DIMENSION, maxX - minX);
  const rawHeight = Math.max(MIN_SHAPE_DIMENSION, maxY - minY);
  const rawDepth = Math.max(MIN_SHAPE_DIMENSION, maxZ - minZ);
  const width = cleanModelDimension(rawWidth);
  const height = cleanModelDimension(rawHeight);
  const depth = cleanModelDimension(rawDepth);
  const positions: number[] = [];
  const bakedCadMetadata = bakeCadMetadataForShapeTransform(shape, { centerX, minY, centerZ, width, depth, height, yawDegrees: meshYawDegrees(shape) });

  mesh.faces.forEach(([ai, bi, ci]) => {
    [mesh.vertices[ai], mesh.vertices[bi], mesh.vertices[ci]].forEach(([x, y, z]) => {
      positions.push(x - centerX, y - minY, z - centerZ);
    });
  });

  // The pivot stays on its spot in the world while the frame changes under it.
  return carryShapePivot(shape, {
    ...shape,
    kind: "mesh",
    x: cleanNearZero(centerX, 0.0005),
    z: cleanNearZero(centerZ, 0.0005),
    elevation: cleanNearZero(minY, 0.0005),
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
    taperTopWidth: undefined,
    taperTopDepth: undefined,
    taperBottomWidth: undefined,
    taperBottomDepth: undefined,
    taperTopScale: undefined,
    taperBottomScale: undefined,
    importedMesh: {
      positions,
      baseWidth: rawWidth,
      baseDepth: rawDepth,
      baseHeight: rawHeight,
      triangleCount: mesh.faces.length,
      sourceFormat: "json",
    },
    ...bakedCadMetadata,
    parametricSource: parametricSourceForBake(shape),
    imagePlate: undefined,
    groupedShapes: undefined,
    groupedBaseWidth: undefined,
    groupedBaseDepth: undefined,
    groupedBaseHeight: undefined,
  });
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Image could not be read"));
      }
    });
    reader.addEventListener("error", () => reject(new Error("Image could not be read")));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("Image could not be decoded")));
    image.src = dataUrl;
  });
}

async function prepareImportedImage(file: File) {
  const sourceUrl = await readFileAsDataUrl(file);
  const image = await loadImageElement(sourceUrl);
  const pixelWidth = image.naturalWidth || image.width;
  const pixelHeight = image.naturalHeight || image.height;

  if (!pixelWidth || !pixelHeight) {
    throw new Error("Image has no readable dimensions");
  }

  const maxTextureSide = 2048;
  const textureScale = Math.min(1, maxTextureSide / Math.max(pixelWidth, pixelHeight));
  if (textureScale >= 1) {
    return {
      dataUrl: sourceUrl,
      mimeType: file.type || "image/png",
      pixelWidth,
      pixelHeight,
    };
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(pixelWidth * textureScale));
  canvas.height = Math.max(1, Math.round(pixelHeight * textureScale));
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Image could not be prepared");
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const mimeType = file.type === "image/jpeg" || file.type === "image/webp" ? file.type : "image/png";
  return {
    dataUrl: canvas.toDataURL(mimeType, 0.92),
    mimeType,
    pixelWidth,
    pixelHeight,
  };
}

function imagePlateDimensions(pixelWidth: number, pixelHeight: number) {
  const aspect = pixelWidth / Math.max(1, pixelHeight);
  const targetMax = 72;
  const minVisibleSide = 14;
  const maxAllowedSide = 110;
  let width = aspect >= 1 ? targetMax : targetMax * aspect;
  let depth = aspect >= 1 ? targetMax / aspect : targetMax;
  const minSide = Math.min(width, depth);

  if (minSide < minVisibleSide) {
    const boost = minVisibleSide / Math.max(0.001, minSide);
    width *= boost;
    depth *= boost;
  }

  const maxSide = Math.max(width, depth);
  if (maxSide > maxAllowedSide) {
    const shrink = maxAllowedSide / maxSide;
    width *= shrink;
    depth *= shrink;
  }

  return {
    width: Number(width.toFixed(2)),
    depth: Number(depth.toFixed(2)),
    height: 1.6,
  };
}

/** `cutMeshes` holds a body's mesh where loose holes have cut it (#203); the others are built from the shape. */
async function toSvg(shapes: WorkplaneShape[], title: string, cutMeshes: ReadonlyArray<MeshData | null> = []) {
  const runtime = await getManifoldRuntime();
  const layers: SvgProjectionLayer[] = [];

  for (const [index, shape] of shapes.entries()) {
    const created: ManifoldSolid[] = [];
    const projectedObjects: unknown[] = [];
    try {
      const cut = cutMeshes[index];
      let solid: ManifoldSolid | null;
      if (cut) {
        const manifoldMesh = meshDataToManifoldMesh(runtime, cut);
        try {
          solid = runtime.Manifold.ofMesh(manifoldMesh);
          created.push(solid);
        } finally {
          disposeManifold(manifoldMesh);
        }
      } else {
        solid = shapeToManifoldSolid(runtime, shape, created);
      }
      if (!solid || solid.status() !== "NoError" || solid.numTri() < 1) {
        throw new Error(`Could not convert ${shape.name} into a watertight SVG outline`);
      }

      // Seen from above with the front at the bottom, as the top view shows it: the plate's z runs
      // down the page. Turned the other way, every export came out mirrored top to bottom (#197).
      const topView = solid.rotate([-90, 0, 0]);
      if (topView !== solid) created.push(topView);
      const projection = topView.project();
      projectedObjects.push(projection);
      const simplified = projection.simplify(0.00001);
      if (simplified !== projection) projectedObjects.push(simplified);
      const polygons = simplified.toPolygons();
      if (!polygons.length) throw new Error(`Top view of ${shape.name} has no exportable area`);
      layers.push({ name: shape.name, color: shape.color, polygons });
    } finally {
      [...new Set([...projectedObjects, ...created])].reverse().forEach(disposeManifold);
    }
  }

  return toSvgProjection(layers, title);
}

function triggerBrowserDownload(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadTextFile(filename: string, content: string, type: string) {
  triggerBrowserDownload(filename, content, type);
}

async function downloadBlobFile(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function shapeAabb(shape: WorkplaneShape): Cuboid {
  const halfWidth = shapeWidth(shape) / 2;
  const halfDepth = shapeDepth(shape) / 2;
  return {
    minX: shape.x - halfWidth,
    maxX: shape.x + halfWidth,
    minY: shape.elevation ?? 0,
    maxY: (shape.elevation ?? 0) + shape.height,
    minZ: shape.z - halfDepth,
    maxZ: shape.z + halfDepth,
  };
}

/**
 * The copies of a pattern: every selected shape, once per extra piece, moved
 * along the row or turned around the circle centre. The originals stay put.
 */
function arrayCopies(sources: WorkplaneShape[], settings: ArraySettings): WorkplaneShape[] {
  const count = clampArrayCount(settings.count);
  const step = circleStepDegrees(count, settings.angle);
  const center = { x: settings.centerX, y: settings.centerY };
  const copies: WorkplaneShape[] = [];
  for (let index = 1; index < count; index += 1) {
    sources.forEach((source) => {
      const clone = cloneWorkplaneShapeTreeWithFreshIds(source, "copy");
      if (settings.mode === "row") {
        const { dx, dy, dz } = rowOffset(settings, index);
        copies.push({ ...clone, x: clone.x + dx, z: clone.z + dz, elevation: (clone.elevation ?? 0) + dy });
        return;
      }
      const degrees = step * index;
      // A rise lifts every copy a little more; a radius change moves it along its
      // line from the centre - together they make a screw or a spiral.
      const rise = (settings.rise ?? 0) * index;
      const radiusChange = (settings.radiusChange ?? 0) * index;
      if (!settings.rotateCopies) {
        const turned = rotateAroundVertical(clone, center, degrees);
        const next = moveAlongRadius(turned, center, degrees, radiusChange);
        copies.push({ ...clone, x: next.x, z: next.z, elevation: (clone.elevation ?? 0) + rise });
        return;
      }
      // Same rotation as the R key and the pivot tool: about the vertical
      // through the centre, at the shape's own height.
      const delta = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(degrees));
      const pivot = new THREE.Vector3(center.x, (clone.elevation ?? 0) + clone.height / 2, -center.y);
      const rotated = canonicalizeShape({ ...clone, ...rotatedGeometryShapePatch(clone, delta, pivot) });
      const placed = moveAlongRadius(rotated, center, degrees, radiusChange);
      const lifted = rise || radiusChange
        ? canonicalizeShape({ ...rotated, x: placed.x, z: placed.z, elevation: (rotated.elevation ?? 0) + rise })
        : rotated;
      copies.push(canonicalizeShape(bakeShapeTransformIntoMesh(lifted)));
    });
  }
  return copies;
}

function boundsForShapes(shapes: WorkplaneShape[]): Cuboid {
  const bounds = shapes.map(meshAabb);
  return boundsForCuboids(bounds);
}

/** A side of an object's own box, named as MCP names it, in the object's unturned frame. */
const LAY_FLAT_SIDES = {
  bottom: [0, -1, 0],
  top: [0, 1, 0],
  left: [-1, 0, 0],
  right: [1, 0, 0],
  back: [0, 0, -1],
  front: [0, 0, 1],
} as const;
type LayFlatSide = keyof typeof LAY_FLAT_SIDES;

/**
 * The outward normal of the real face of a body that points closest to
 * `direction` - so a rough direction, or a side of the box, lands an actual
 * face flat and not a tilt between two. Mesh winding is not always
 * consistent, so "outward" is taken as away from the body's centre; a face
 * never counts the wrong way round (the bottom never passes for the top).
 */
function nearestFaceNormal(shape: WorkplaneShape, direction: THREE.Vector3): THREE.Vector3 | null {
  const mesh = meshForShape(shape);
  const wanted = direction.clone().normalize();
  const centre = new THREE.Vector3();
  mesh.vertices.forEach(([x, y, z]) => centre.add(new THREE.Vector3(x, y, z)));
  if (mesh.vertices.length) centre.divideScalar(mesh.vertices.length);
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  let best: THREE.Vector3 | null = null;
  let bestScore = -Infinity;
  mesh.faces.forEach(([ia, ib, ic]) => {
    const a = mesh.vertices[ia];
    const b = mesh.vertices[ib];
    const c = mesh.vertices[ic];
    if (!a || !b || !c) return;
    ab.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    ac.set(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
    const normal = ab.clone().cross(ac);
    if (normal.lengthSq() < 1e-12) return;
    normal.normalize();
    const middle = new THREE.Vector3((a[0] + b[0] + c[0]) / 3 - centre.x, (a[1] + b[1] + c[1]) / 3 - centre.y, (a[2] + b[2] + c[2]) / 3 - centre.z);
    if (normal.dot(middle) < 0) normal.negate();
    const score = normal.dot(wanted);
    if (score > bestScore + 1e-9) {
      bestScore = score;
      best = normal;
    }
  });
  return best;
}

/**
 * Turns `movable` so the face with outward `normal` rests on the workplane -
 * the shortest turn, one pivot for a group so it keeps its spacing - and moves
 * them down onto it together. The same step the "Lay flat" tool takes after a
 * click on a face.
 */
function laidFlatShapes(shapes: WorkplaneShape[], movable: WorkplaneShape[], normal: { x: number; y: number; z: number }, workplane: PlacementWorkplane): WorkplaneShape[] {
  const rotation = layFlatRotation(normal, workplane.normal);
  const pivot = movable.length > 1 ? selectionCenterOnWorkplane(movable, workplane) : null;
  const turned = new Map(movable.map((shape) => [
    shape.id,
    canonicalizeShape(bakeShapeTransformIntoMesh(canonicalizeShape({ ...shape, ...rotatedGeometryShapePatch(shape, rotation, pivot) }))),
  ]));
  // One translation for the whole selection, so it stays together as it lands.
  const translation = translationToWorkplane(
    workplane,
    [...turned.values()].flatMap((shape) => meshForShape(shape).vertices.map(([x, y, z]) => ({ x, y, z }))),
  );
  return shapes.map((shape) => {
    const next = turned.get(shape.id);
    if (!next) return shape;
    return {
      ...next,
      x: cleanNearZero(next.x + translation.x),
      z: cleanNearZero(next.z + translation.z),
      elevation: cleanNearZero((next.elevation ?? 0) + translation.y),
    };
  });
}

/**
 * Moves the body of `source` so its face meets the face of `target`, as the
 * "Align faces" tool does: turned parallel about the clicked point, then slid
 * along the target face's normal. Only the turn's angles change on the body,
 * so a shape keeps its own settings.
 */
function matedShapes(shapes: WorkplaneShape[], source: FacePick, target: FacePick, mode: MateMode, gap: number): WorkplaneShape[] {
  const motion = mateMotion(source, target, mode, gap);
  return shapes.map((shape) => {
    if (shape.id !== source.shapeId) return shape;
    const turned = motion.rotation
      ? canonicalizeShape({ ...shape, ...rotatedGeometryShapePatch(shape, motion.rotation, motion.pivot) })
      : shape;
    return canonicalizeShape({
      ...turned,
      x: cleanNearZero(turned.x + motion.translation.x),
      z: cleanNearZero(turned.z + motion.translation.z),
      elevation: cleanNearZero((turned.elevation ?? 0) + motion.translation.y),
    });
  });
}

function selectionCenterOnWorkplane(shapes: WorkplaneShape[], workplane: PlacementWorkplane) {
  const xAxis = new THREE.Vector3(workplane.xAxis.x, workplane.xAxis.y, workplane.xAxis.z).normalize();
  const yAxis = new THREE.Vector3(workplane.normal.x, workplane.normal.y, workplane.normal.z).normalize();
  const zAxis = new THREE.Vector3(workplane.zAxis.x, workplane.zAxis.y, workplane.zAxis.z).normalize();
  const min = new THREE.Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  const max = new THREE.Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);

  shapes.forEach((shape) => {
    meshForShape(shape).vertices.forEach(([x, y, z]) => {
      const point = new THREE.Vector3(x, y, z);
      min.x = Math.min(min.x, point.dot(xAxis));
      min.y = Math.min(min.y, point.dot(yAxis));
      min.z = Math.min(min.z, point.dot(zAxis));
      max.x = Math.max(max.x, point.dot(xAxis));
      max.y = Math.max(max.y, point.dot(yAxis));
      max.z = Math.max(max.z, point.dot(zAxis));
    });
  });

  if ([min.x, min.y, min.z, max.x, max.y, max.z].every(Number.isFinite)) {
    return new THREE.Vector3()
      .addScaledVector(xAxis, (min.x + max.x) / 2)
      .addScaledVector(yAxis, (min.y + max.y) / 2)
      .addScaledVector(zAxis, (min.z + max.z) / 2);
  }

  const bounds = boundsForShapes(shapes);
  return new THREE.Vector3(
    (bounds.minX + bounds.maxX) / 2,
    (bounds.minY + bounds.maxY) / 2,
    (bounds.minZ + bounds.maxZ) / 2,
  );
}

function boundsForCuboids(bounds: Cuboid[]): Cuboid {
  return {
    minX: Math.min(...bounds.map((box) => box.minX)),
    maxX: Math.max(...bounds.map((box) => box.maxX)),
    minY: Math.min(...bounds.map((box) => box.minY)),
    maxY: Math.max(...bounds.map((box) => box.maxY)),
    minZ: Math.min(...bounds.map((box) => box.minZ)),
    maxZ: Math.max(...bounds.map((box) => box.maxZ)),
  };
}

function meshAabb(shape: WorkplaneShape): Cuboid {
  // A wrapped body covers only an arc; its box around the cylinder's axis is what
  // makes "centre on the cylinder" put it on that cylinder's wall (#106).
  if (shape.cylinderWrap && shape.importedMesh) return shapeAabb(shape);
  const mesh = meshForShape(shape);
  if (mesh.vertices.length === 0) {
    return shapeAabb(shape);
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  mesh.vertices.forEach(([x, y, z]) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  });

  if (![minX, minY, minZ, maxX, maxY, maxZ].every(Number.isFinite)) {
    return shapeAabb(shape);
  }

  return { minX, maxX, minY, maxY, minZ, maxZ };
}

const ALIGN_EPSILON = 0.0005;
const ALIGN_AXES: AlignAxis[] = ["x", "y", "z"];
const ALIGN_TARGETS: AlignTarget[] = ["min", "center", "max"];

function alignCoordinate(bounds: Cuboid, axis: AlignAxis, target: AlignTarget) {
  const min = axis === "x" ? bounds.minX : axis === "y" ? bounds.minY : bounds.minZ;
  const max = axis === "x" ? bounds.maxX : axis === "y" ? bounds.maxY : bounds.maxZ;
  if (target === "min") {
    return min;
  }
  if (target === "max") {
    return max;
  }
  return (min + max) / 2;
}

function alignmentLabel(axis: AlignAxis, target: AlignTarget) {
  if (axis === "x") {
    return target === "min" ? t("align.left") : target === "max" ? t("align.right") : t("align.center");
  }
  if (axis === "z") {
    return target === "min" ? t("align.front") : target === "max" ? t("align.back") : t("align.middle");
  }
  return target === "min" ? t("align.bottom") : target === "max" ? t("align.top") : t("align.middle");
}

function alignmentStatuses(selection: WorkplaneShape[], anchorId: string | null): AlignHandleStatus[] {
  if (selection.length < 2) {
    return [];
  }

  const boundsById = new Map(selection.map((shape) => [shape.id, meshAabb(shape)]));
  const anchorBounds = anchorId ? boundsById.get(anchorId) ?? null : null;
  const referenceBounds = anchorBounds ?? boundsForCuboids(Array.from(boundsById.values()));

  return ALIGN_AXES.flatMap((axis) =>
    ALIGN_TARGETS.map((target) => {
      const targetValue = alignCoordinate(referenceBounds, axis, target);
      const aligned = selection.every((shape) => {
        const bounds = boundsById.get(shape.id);
        return bounds ? Math.abs(alignCoordinate(bounds, axis, target) - targetValue) <= ALIGN_EPSILON : true;
      });
      const wouldMove = selection.some((shape) => {
        if (shape.locked || shape.id === anchorId) {
          return false;
        }
        const bounds = boundsById.get(shape.id);
        return bounds ? Math.abs(alignCoordinate(bounds, axis, target) - targetValue) > ALIGN_EPSILON : false;
      });
      const label = alignmentLabel(axis, target);
      return {
        axis,
        target,
        aligned,
        disabled: !wouldMove,
        title: aligned ? t("align.already", { label }) : t("align.do", { label }),
      };
    }),
  );
}

function alignedShapesForSelection(
  shapes: WorkplaneShape[],
  selectedIds: string[],
  selectedShapes: WorkplaneShape[],
  anchorId: string | null,
  axis: AlignAxis,
  target: AlignTarget,
) {
  const selected = new Set(selectedIds);
  const boundsById = new Map(selectedShapes.map((shape) => [shape.id, meshAabb(shape)]));
  const anchorBounds = anchorId ? boundsById.get(anchorId) ?? null : null;
  const referenceBounds = anchorBounds ?? boundsForCuboids(Array.from(boundsById.values()));
  const targetValue = alignCoordinate(referenceBounds, axis, target);
  let moved = 0;

  const nextShapes = shapes.map((shape) => {
    if (!selected.has(shape.id) || shape.locked || shape.id === anchorId) {
      return shape;
    }
    const bounds = boundsById.get(shape.id);
    if (!bounds) {
      return shape;
    }
    const delta = targetValue - alignCoordinate(bounds, axis, target);
    if (Math.abs(delta) <= ALIGN_EPSILON) {
      return shape;
    }
    moved += 1;
    if (axis === "x") {
      return { ...shape, x: cleanNearZero(Number((shape.x + delta).toFixed(4)), ALIGN_EPSILON) };
    }
    if (axis === "z") {
      return { ...shape, z: cleanNearZero(Number((shape.z + delta).toFixed(4)), ALIGN_EPSILON) };
    }
    return { ...shape, elevation: cleanNearZero(Number(((shape.elevation ?? 0) + delta).toFixed(4)), ALIGN_EPSILON) };
  });

  return { nextShapes, moved };
}

function effectiveAlignmentAnchorId(selection: WorkplaneShape[], requestedAnchorId: string | null) {
  return selection.find((shape) => shape.locked)?.id
    ?? (requestedAnchorId && selection.some((shape) => shape.id === requestedAnchorId) ? requestedAnchorId : null);
}

function mirrorAxisLabel(axis: AlignAxis) {
  return axis === "x" ? t("mirror.leftRight") : axis === "z" ? t("mirror.frontBack") : t("mirror.topBottom");
}

function mirrorFlagPatch(shape: WorkplaneShape, axis: AlignAxis) {
  if (axis === "x") {
    return { mirrorX: !shape.mirrorX };
  }
  if (axis === "z") {
    return { mirrorZ: !shape.mirrorZ };
  }
  return { mirrorY: !shape.mirrorY };
}

function reflectionMatrixForAxis(axis: AlignAxis) {
  return new THREE.Matrix4().makeScale(axis === "x" ? -1 : 1, axis === "y" ? -1 : 1, axis === "z" ? -1 : 1);
}

function mirroredShapePatch(shape: WorkplaneShape, axis: AlignAxis, pivot: number): Partial<WorkplaneShape> {
  const centerY = (shape.elevation ?? 0) + shape.height / 2;
  const nextCenter = axis === "x" ? 2 * pivot - shape.x : axis === "z" ? 2 * pivot - shape.z : 2 * pivot - centerY;
  const worldReflection = reflectionMatrixForAxis(axis);
  const localReflection = reflectionMatrixForAxis(axis);
  const currentRotation = new THREE.Matrix4().makeRotationFromQuaternion(quaternionForShape(shape));
  const nextRotationMatrix = worldReflection.multiply(currentRotation).multiply(localReflection);
  const nextQuaternion = new THREE.Quaternion().setFromRotationMatrix(nextRotationMatrix);
  const rotationPatch = rotationFromQuaternion(nextQuaternion);
  const positionPatch =
    axis === "x"
      ? { x: cleanNearZero(Number(nextCenter.toFixed(4)), ALIGN_EPSILON) }
      : axis === "z"
        ? { z: cleanNearZero(Number(nextCenter.toFixed(4)), ALIGN_EPSILON) }
        : { elevation: cleanNearZero(Number((nextCenter - shape.height / 2).toFixed(4)), ALIGN_EPSILON) };

  return {
    ...shape,
    ...positionPatch,
    ...rotationPatch,
    ...mirrorFlagPatch(shape, axis),
  };
}

function mirroredShapesForSelection(shapes: WorkplaneShape[], selectedIds: string[], selectedShapes: WorkplaneShape[], axis: AlignAxis) {
  if (selectedShapes.length === 0) {
    return { nextShapes: shapes, moved: 0 };
  }

  const selected = new Set(selectedIds);
  const selectionBounds = boundsForShapes(selectedShapes);
  const pivot = axis === "x" ? (selectionBounds.minX + selectionBounds.maxX) / 2 : axis === "z" ? (selectionBounds.minZ + selectionBounds.maxZ) / 2 : (selectionBounds.minY + selectionBounds.maxY) / 2;
  let moved = 0;
  const nextShapes = shapes.map((shape) => {
    if (!selected.has(shape.id) || shape.locked) {
      return shape;
    }
    moved += 1;
    return {
      ...shape,
      ...mirroredShapePatch(shape, axis, pivot),
    };
  });

  return { nextShapes, moved };
}

function geometryFromMeshData(mesh: MeshData) {
  const positions: number[] = [];
  mesh.faces.forEach(([ai, bi, ci]) => {
    [mesh.vertices[ai], mesh.vertices[bi], mesh.vertices[ci]].forEach(([x, y, z]) => {
      positions.push(x, y, z);
    });
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function positionsFromGeometryDrawRange(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute("position");
  if (!position) {
    return [];
  }

  const positions: number[] = [];
  const drawStart = Math.max(0, Math.floor(geometry.drawRange.start || 0));
  if (geometry.index) {
    const index = geometry.index;
    const drawCount = Number.isFinite(geometry.drawRange.count) ? Math.max(0, Math.floor(geometry.drawRange.count)) : index.count - drawStart;
    const end = Math.min(index.count, drawStart + drawCount);
    for (let i = drawStart; i + 2 < end; i += 3) {
      for (let offset = 0; offset < 3; offset += 1) {
        const vertexIndex = index.getX(i + offset);
        positions.push(position.getX(vertexIndex), position.getY(vertexIndex), position.getZ(vertexIndex));
      }
    }
    return positions;
  }

  const drawCount = Number.isFinite(geometry.drawRange.count) ? Math.max(0, Math.floor(geometry.drawRange.count)) : position.count - drawStart;
  const end = Math.min(position.count, drawStart + drawCount);
  for (let i = drawStart; i + 2 < end; i += 3) {
    positions.push(
      position.getX(i),
      position.getY(i),
      position.getZ(i),
      position.getX(i + 1),
      position.getY(i + 1),
      position.getZ(i + 1),
      position.getX(i + 2),
      position.getY(i + 2),
      position.getZ(i + 2),
    );
  }
  return positions;
}

function boundsForPositions(positions: number[]): Cuboid | null {
  if (positions.length < 9) {
    return null;
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }

  return [minX, minY, minZ, maxX, maxY, maxZ].every(Number.isFinite) ? { minX, maxX, minY, maxY, minZ, maxZ } : null;
}

function quantizedPointKey([x, y, z]: Vec3, tolerance: number) {
  return [x, y, z].map((value) => Math.round(value / tolerance)).join(",");
}

function triangleSignature(points: Vec3[], tolerance: number) {
  return points.map((point) => quantizedPointKey(point, tolerance)).sort().join("|");
}

function addSignature(signatures: Map<string, number>, signature: string) {
  signatures.set(signature, (signatures.get(signature) ?? 0) + 1);
}

function meshSignatureMap(mesh: MeshData, tolerance: number) {
  const signatures = new Map<string, number>();
  mesh.faces.forEach(([ai, bi, ci]) => {
    addSignature(signatures, triangleSignature([mesh.vertices[ai], mesh.vertices[bi], mesh.vertices[ci]], tolerance));
  });
  return signatures;
}

function positionsSignatureMap(positions: number[], tolerance: number) {
  const signatures = new Map<string, number>();
  for (let i = 0; i + 8 < positions.length; i += 9) {
    addSignature(
      signatures,
      triangleSignature(
        [
          [positions[i], positions[i + 1], positions[i + 2]],
          [positions[i + 3], positions[i + 4], positions[i + 5]],
          [positions[i + 6], positions[i + 7], positions[i + 8]],
        ],
        tolerance,
      ),
    );
  }
  return signatures;
}

function signatureMapsDiffer(a: Map<string, number>, b: Map<string, number>) {
  if (a.size !== b.size) {
    return true;
  }
  for (const [signature, count] of a) {
    if (b.get(signature) !== count) {
      return true;
    }
  }
  return false;
}

function positionsDifferFromMeshData(positions: number[], mesh: MeshData, tolerance = 0.0005) {
  if (Math.floor(positions.length / 9) !== mesh.faces.length) {
    return true;
  }
  return signatureMapsDiffer(positionsSignatureMap(positions, tolerance), meshSignatureMap(mesh, tolerance));
}

function geometryDiffersFromMeshData(geometry: THREE.BufferGeometry, mesh: MeshData, tolerance = 0.0005) {
  return positionsDifferFromMeshData(positionsFromGeometryDrawRange(geometry), mesh, tolerance);
}

function sortedEdgeKey(a: Vec3, b: Vec3, tolerance: number) {
  const ak = quantizedPointKey(a, tolerance);
  const bk = quantizedPointKey(b, tolerance);
  return ak < bk ? `${ak}|${bk}` : `${bk}|${ak}`;
}

function edgeMidpoint(a: Vec3, b: Vec3): Vec3 {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
}

function addBoundaryEdge(edges: Map<string, { count: number; midpoint: Vec3 }>, a: Vec3, b: Vec3, tolerance: number) {
  const key = sortedEdgeKey(a, b, tolerance);
  const existing = edges.get(key);
  if (existing) {
    existing.count += 1;
  } else {
    edges.set(key, { count: 1, midpoint: edgeMidpoint(a, b) });
  }
}

function positionsBoundaryEdges(positions: number[], tolerance = 0.0005) {
  const edges = new Map<string, { count: number; midpoint: Vec3 }>();
  for (let i = 0; i + 8 < positions.length; i += 9) {
    const a: Vec3 = [positions[i], positions[i + 1], positions[i + 2]];
    const b: Vec3 = [positions[i + 3], positions[i + 4], positions[i + 5]];
    const c: Vec3 = [positions[i + 6], positions[i + 7], positions[i + 8]];
    addBoundaryEdge(edges, a, b, tolerance);
    addBoundaryEdge(edges, b, c, tolerance);
    addBoundaryEdge(edges, c, a, tolerance);
  }
  return Array.from(edges.values()).filter((edge) => edge.count === 1);
}

function meshDataPositions(mesh: MeshData) {
  const positions: number[] = [];
  mesh.faces.forEach(([ai, bi, ci]) => {
    [mesh.vertices[ai], mesh.vertices[bi], mesh.vertices[ci]].forEach(([x, y, z]) => {
      positions.push(x, y, z);
    });
  });
  return positions;
}

function meshFaceComponents(mesh: MeshData, tolerance = SEPARATE_PARTS_VERTEX_TOLERANCE) {
  if (mesh.faces.length === 0) return [];
  const keysByFace = mesh.faces.map((face) => face.map((vertexIndex) => quantizedPointKey(mesh.vertices[vertexIndex], tolerance)));
  const facesByVertex = new Map<string, number[]>();
  keysByFace.forEach((keys, faceIndex) => {
    keys.forEach((key) => {
      const current = facesByVertex.get(key);
      if (current) {
        current.push(faceIndex);
      } else {
        facesByVertex.set(key, [faceIndex]);
      }
    });
  });

  const visited = new Uint8Array(mesh.faces.length);
  const components: number[][] = [];
  for (let faceIndex = 0; faceIndex < mesh.faces.length; faceIndex += 1) {
    if (visited[faceIndex]) continue;
    const component: number[] = [];
    const queue = [faceIndex];
    visited[faceIndex] = 1;
    while (queue.length > 0) {
      const current = queue.pop() as number;
      component.push(current);
      keysByFace[current].forEach((key) => {
        const neighbors = facesByVertex.get(key);
        if (!neighbors) return;
        facesByVertex.delete(key);
        neighbors.forEach((neighbor) => {
          if (visited[neighbor]) return;
          visited[neighbor] = 1;
          queue.push(neighbor);
        });
      });
    }
    components.push(component);
  }
  return components;
}

function meshComponentShape(source: WorkplaneShape, mesh: MeshData, faceIndices: number[], partIndex: number, totalParts: number): WorkplaneShape | null {
  const worldPositions: number[] = [];
  faceIndices.forEach((faceIndex) => {
    const face = mesh.faces[faceIndex];
    if (!face) return;
    face.forEach((vertexIndex) => {
      const vertex = mesh.vertices[vertexIndex];
      if (vertex) worldPositions.push(vertex[0], vertex[1], vertex[2]);
    });
  });

  const bounds = boundsForPositions(worldPositions);
  if (!bounds) return null;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;
  const rawWidth = Math.max(MIN_SHAPE_DIMENSION, bounds.maxX - bounds.minX);
  const rawHeight = Math.max(MIN_SHAPE_DIMENSION, bounds.maxY - bounds.minY);
  const rawDepth = Math.max(MIN_SHAPE_DIMENSION, bounds.maxZ - bounds.minZ);
  const width = cleanModelDimension(rawWidth);
  const height = cleanModelDimension(rawHeight);
  const depth = cleanModelDimension(rawDepth);
  const positions = worldPositions.map((value, index) => {
    if (index % 3 === 0) return value - centerX;
    if (index % 3 === 1) return value - bounds.minY;
    return value - centerZ;
  });

  return canonicalizeShape({
    id: createLocalId(`${source.id}-part`),
    name: totalParts > 1 ? t("inspector.separatedPartName", { name: source.name, index: partIndex + 1 }) : source.name,
    kind: "mesh",
    color: source.color,
    hole: source.hole || undefined,
    x: cleanNearZero(centerX, 0.0005),
    z: cleanNearZero(centerZ, 0.0005),
    elevation: cleanNearZero(bounds.minY, 0.0005),
    size: Math.max(width, depth),
    width,
    depth,
    height,
    rotation: 0,
    rotationX: 0,
    rotationZ: 0,
    importedMesh: {
      positions,
      baseWidth: rawWidth,
      baseDepth: rawDepth,
      baseHeight: rawHeight,
      triangleCount: Math.floor(positions.length / 9),
      sourceFormat: "json",
    },
    locked: false,
    hidden: source.hidden,
  });
}

/**
 * The body a shape becomes when it is wrapped around a cylinder (#106), or
 * why it cannot be. What lies flat on the plate stands up on the wall; the
 * cylinder's axis is the middle of the new shape, so centring it on a
 * cylinder puts it right on that cylinder's wall, like curved text.
 * The wall sits where the body lay, so nothing jumps across the plate.
 */
function cylinderWrappedShape(shape: WorkplaneShape, diameter: number, inward: boolean): WorkplaneShape | CylinderWrapError {
  const mesh = meshForShape(shape);
  const result = wrapMeshAroundCylinder({ vertices: mesh.vertices, faces: mesh.faces }, { diameter, inward });
  if ("error" in result) return result.error;
  const rawSize = result.outerRadius * 2;
  const rawHeight = Math.max(MIN_SHAPE_DIMENSION, result.height);
  const size = cleanModelDimension(rawSize);
  const middleRadius = diameter / 2 + (inward ? -result.thickness / 2 : result.thickness / 2);
  return canonicalizeShape({
    id: shape.id,
    name: shape.name,
    kind: "mesh",
    color: shape.color,
    hole: shape.hole || undefined,
    x: cleanNearZero(result.flatCenter.x, 0.0005),
    z: cleanNearZero(result.flatCenter.z - middleRadius, 0.0005),
    elevation: cleanNearZero(result.flatBottom, 0.0005),
    size,
    width: size,
    depth: size,
    height: cleanModelDimension(rawHeight),
    rotation: 0,
    rotationX: 0,
    rotationZ: 0,
    importedMesh: {
      positions: result.positions,
      baseWidth: rawSize,
      baseDepth: rawSize,
      baseHeight: rawHeight,
      triangleCount: Math.floor(result.positions.length / 9),
      sourceFormat: "json",
    },
    cylinderWrap: { diameter, ...(inward ? { inward: true } : {}) },
    locked: false,
    hidden: shape.hidden,
  });
}

function canWrapAroundCylinder(shape: WorkplaneShape | null | undefined) {
  return Boolean(shape && !shape.locked && shape.groupOperation !== "bundle" && !isNonSolidShapeKind(shape.kind));
}

/**
 * The settings panel offers wrapping only where it is what people want: an
 * imported outline or model (an SVG above all), text and a sketch body. On a
 * box, a cylinder or a gear the card was only in the way; through MCP any
 * body can still be wrapped.
 */
/** A text, or a stack of text layers, that the layers card (#215) can work on. */
function offersTextLayers(shape: WorkplaneShape | null | undefined) {
  if (!shape || shape.locked || shape.importedMesh || shape.cadBrep) return false;
  if (shape.kind === "text") return !shape.cylinderWrap;
  return Boolean(shape.layeredText && shape.groupOperation === "bundle" && shape.groupedShapes?.length);
}

/**
 * The text and layers a shape stands for: a plain text is one layer of itself; a layered-text
 * bundle is read from its parts as they stand in the world. Null for anything else.
 */
function textLayerStack(shape: WorkplaneShape): TextLayerStack | null {
  if (shape.kind === "text") {
    return textLayersOf([shape]);
  }
  if (!shape.layeredText || !shape.groupedShapes?.length) return null;
  return textLayersOf(restoreGroupedChildren(shape));
}

/**
 * A text's layers as one shape: a bundle flagged as layered text, or, with one layer only, that
 * text itself. `keepId` and `name` carry over from the shape it replaces.
 */
function layeredTextShape(source: WorkplaneShape, layers: readonly TextLayer[], ids: (string | undefined)[], keepId: string, keep: Pick<WorkplaneShape, "locked" | "hidden" | "name">, previousText?: string, keyring: NameTagKeyring | null = null): WorkplaneShape {
  const words = (source.text ?? "TEXT").trim() || "Text";
  // The stack is named after its words unless somebody gave it a name of its own.
  const name = !keep.name || keep.name === "Bundle" || keep.name === "Text" || keep.name === previousText ? words : keep.name;
  const parts = textLayerShapes(source, layers, ids, keyring);
  if (parts.length === 1) return canonicalizeShape({ ...parts[0], id: keepId, name, locked: keep.locked, hidden: keep.hidden });
  const group = groupedShape(parts);
  if (!group) throw new Error("Could not build the text layers");
  return canonicalizeShape({ ...group, id: keepId, name, groupOperation: "bundle", layeredText: true, locked: keep.locked, hidden: keep.hidden });
}

/**
 * The name tag panel (#215): the letters of a stack with other words, another font or another
 * letter size. New words or another font keep the letter size, so a tag grows with its name.
 */
function nameTagSource(source: WorkplaneShape, change: { text?: string; font?: string; letterSize?: number }): WorkplaneShape {
  const next = { ...source, ...(change.text !== undefined ? { text: change.text } : {}), ...(change.font !== undefined ? { font: change.font } : {}) };
  if (change.text === undefined && change.font === undefined && change.letterSize === undefined) return next;
  return { ...next, ...textLetterSizePatch(next, change.letterSize ?? textLetterSize(source)) };
}

/**
 * The panel's name list (#215): one tag per name like the given stack, at its letter size, in
 * rows and columns from the place of the first, which takes `first`'s id and its layers' ids.
 */
function nameTagsFor(stack: { source: WorkplaneShape; layers: readonly TextLayer[]; keyring: NameTagKeyring | null }, names: readonly string[], gap: number, first: { id: string; ids: string[] }): WorkplaneShape[] {
  const tags = names.map((name, index) => layeredTextShape(
    nameTagSource(stack.source, { text: name }),
    stack.layers,
    index === 0 ? first.ids : [],
    index === 0 ? first.id : createLocalId("text-tag"),
    { locked: false, hidden: false, name },
    stack.source.text,
    stack.keyring,
  ));
  // Every tag is as wide as its name; the rows take the widest and deepest.
  const width = Math.max(...tags.map(shapeWidth));
  const depth = Math.max(...tags.map(shapeDepth));
  const columns = Math.max(1, Math.round(Math.sqrt((tags.length * (depth + gap)) / (width + gap))));
  const offsets = nameTagOffsets(tags.length, width, depth, gap, columns);
  return tags.map((tag, index) => (index === 0 ? tag : canonicalizeShape({ ...tag, x: tag.x + offsets[index].x, z: tag.z + offsets[index].z })));
}

/** A shape fresh from the library as it is placed: the name tag (#215) comes as a text "Name" in the default layers. */
function prepareNewShape(asset: ShapeAsset, shape: WorkplaneShape): WorkplaneShape {
  if (asset.id !== nameTagAsset.id || shape.kind !== "text") return shape;
  const source = nameTagSource(shape, { text: t("nameTag.defaultText"), letterSize: NAME_TAG_LETTER_SIZE });
  return layeredTextShape(source, DEFAULT_TEXT_LAYERS, [], shape.id, { locked: false, hidden: false, name: "Text" });
}

function offersCylinderWrap(shape: WorkplaneShape | null | undefined) {
  if (!canWrapAroundCylinder(shape) || !shape) return false;
  return Boolean(shape.importedMesh && !shape.groupedShapes?.length) || shape.kind === "text" || Boolean(shape.sketchProfile);
}

/** Simplifying is for meshes dense enough to be worth it; a plate from an SVG has nothing to give. */
const MESH_SIMPLIFY_MIN_TRIANGLES = 500;

function offersMeshSimplify(shape: WorkplaneShape | null | undefined) {
  return Boolean(shape?.importedMesh && shape.groupOperation !== "bundle" && shape.importedMesh.triangleCount >= MESH_SIMPLIFY_MIN_TRIANGLES);
}

/**
 * The body with its mesh replaced by a simplified one in the same frame, or
 * null when that is no reduction. What comes out is a plain mesh: the file it
 * was imported from, its exact B-Rep, the parts of a group and the edge
 * history all describe the mesh that was - they do not come along, or the
 * next load, export or regroup would bring the old triangles back.
 */
function simplifiedMeshShape(shape: WorkplaneShape, positions: number[]): WorkplaneShape | null {
  const source = shape.importedMesh;
  const triangleCount = Math.floor(positions.length / 9);
  if (!source || triangleCount < 4 || triangleCount >= source.triangleCount) return null;
  return canonicalizeShape({
    ...shape,
    importedMesh: {
      positions,
      baseWidth: source.baseWidth,
      baseDepth: source.baseDepth,
      baseHeight: source.baseHeight,
      triangleCount,
      sourceFormat: "json",
    },
    groupedShapes: undefined,
    groupOperation: undefined,
    edgeTreatments: undefined,
    edgeTreatmentHistory: undefined,
    edgeResizeMode: undefined,
    cadBrep: undefined,
    cadDisplayEdges: undefined,
  });
}

function separateMeshParts(shape: WorkplaneShape) {
  const mesh = meshForShape(shape);
  const components = meshFaceComponents(mesh).filter((component) => component.length > 0);
  if (components.length <= 1) return [];
  return components
    .map((component, index) => meshComponentShape(shape, mesh, component, index, components.length))
    .filter((part): part is WorkplaneShape => Boolean(part));
}

/**
 * The exact outline of each glyph piece cadModifierSourceParts cuts a text
 * into, keyed by the piece. The pieces only live for one edge-tool request,
 * so a WeakMap lets them go with it.
 */
const textGlyphProfileByPart = new WeakMap<WorkplaneShape, CadModifierProfilePart>();

/**
 * Which glyph each triangle of a text's display mesh belongs to: the mesh
 * lists the glyphs one after another, as three.js extrudes them. Null when
 * the counts do not add up (then the pieces simply go without outlines).
 */
function textGlyphIndexByFace(shape: WorkplaneShape, faceCount: number) {
  let glyphs: ReturnType<typeof textGlyphProfiles> = null;
  try {
    glyphs = textGlyphProfiles(shape);
  } catch {
    return null;
  }
  if (!glyphs || glyphs.reduce((total, glyph) => total + glyph.triangleCount, 0) !== faceCount) return null;
  const glyphOfFace = new Array<number>(faceCount);
  let face = 0;
  glyphs.forEach((glyph, index) => {
    for (let count = 0; count < glyph.triangleCount; count += 1) glyphOfFace[face++] = index;
  });
  return { glyphs, glyphOfFace };
}

function cadModifierSourceParts(shape: WorkplaneShape) {
  // The hinge reaches the kernel as the boxes, cylinders and tubes it is made of.
  if (shape.kind === "hinge" && !shape.importedMesh && !shape.cadBrep && !shapeHasShapeDeform(shape)) return hingeWorldParts(shape);
  if (shape.kind !== "text" || shape.importedMesh || shape.cadBrep) return [shape];
  const mesh = meshForShape(shape);
  const components = meshFaceComponents(mesh).filter((component) => component.length > 0);
  if (components.length <= 1) return [shape];
  const glyphMap = textGlyphIndexByFace(shape, mesh.faces.length);
  const glyphParts: WorkplaneShape[] = [];
  components.forEach((component, index) => {
    const part = meshComponentShape(shape, mesh, component, index, components.length);
    if (!part) return;
    // A piece that is exactly one whole glyph gets that glyph's exact outline;
    // glyphs that touch share a piece, and a glyph that falls apart into
    // several pieces has none that is all of it - both keep the mesh path.
    const glyphIndices = glyphMap ? new Set(component.map((face) => glyphMap.glyphOfFace[face])) : null;
    const glyph = glyphIndices?.size === 1 ? glyphMap?.glyphs[[...glyphIndices][0]] : null;
    const profile = glyph && glyph.triangleCount === component.length ? glyph.profile : null;
    if (profile) textGlyphProfileByPart.set(part, profile);
    glyphParts.push(part);
  });
  return glyphParts.length > 1 ? glyphParts : [shape];
}

/**
 * Counting the loose pieces of an imported mesh walks every triangle, and the
 * toolbar asks again each time the selected shape changes - also when it was
 * only moved. Where the shape stands does not change how many pieces it has,
 * so the count is kept per mesh and per everything-but-the-position.
 */
const importedPartCounts = new WeakMap<object, { key: string; count: number }>();

function separablePartCount(shape: WorkplaneShape) {
  if (shape.locked || shape.hole) return 0;
  if (shape.groupedShapes?.length && !shape.importedMesh) return shape.groupedShapes.length;
  if (!shape.importedMesh) return meshFaceComponents(meshForShape(shape)).length;
  const key = JSON.stringify({
    ...shape,
    x: 0,
    z: 0,
    elevation: 0,
    importedMesh: undefined,
    groupedShapes: undefined,
    edgeTreatmentHistory: undefined,
    cadBrep: undefined,
    cadDisplayEdges: undefined,
  });
  const cached = importedPartCounts.get(shape.importedMesh);
  if (cached?.key === key) return cached.count;
  const count = meshFaceComponents(meshForShape(shape)).length;
  importedPartCounts.set(shape.importedMesh, { key, count });
  return count;
}

function separateShapeParts(shape: WorkplaneShape) {
  if (shape.locked || shape.hole) return [];
  if (shape.groupedShapes?.length && !shape.importedMesh) {
    const restored = restoreGroupedChildren(shape);
    return restored.length > 1 ? restored : [];
  }
  return separateMeshParts(shape);
}

function cutBoundaryEdgeCount(positions: number[], cutters: WorkplaneShape[]) {
  if (cutters.length === 0) {
    return 0;
  }
  return positionsBoundaryEdges(positions).filter((edge) => cutters.some((cutter) => pointInsideHoleShape(edge.midpoint, cutter))).length;
}

function introducesOpenCutBoundary(resultPositions: number[], sourceMesh: MeshData, cutters: WorkplaneShape[]) {
  const resultCutBoundaries = cutBoundaryEdgeCount(resultPositions, cutters);
  if (resultCutBoundaries === 0) {
    return false;
  }

  const sourceCutBoundaries = cutBoundaryEdgeCount(meshDataPositions(sourceMesh), cutters);
  return resultCutBoundaries > sourceCutBoundaries + Math.max(4, Math.floor(sourceCutBoundaries * 0.25));
}

function paddedCutterShape(shape: WorkplaneShape): WorkplaneShape {
  const width = shapeWidth(shape) + CUTTER_PADDING * 2;
  const depth = shapeDepth(shape) + CUTTER_PADDING * 2;
  const height = shape.height + CUTTER_PADDING * 2;
  return {
    ...shape,
    width,
    depth,
    height,
    size: Math.max(width, depth),
    elevation: (shape.elevation ?? 0) - CUTTER_PADDING,
    baseRadius: shape.baseRadius ? shape.baseRadius + CUTTER_PADDING : shape.baseRadius,
  };
}

function brushFromShape(shape: WorkplaneShape, cutter = false) {
  const brush = new Brush(geometryFromMeshData(meshForShape(cutter ? paddedCutterShape(shape) : shape)));
  brush.updateMatrixWorld(true);
  return brush;
}

function positiveCuboid(cuboid: Cuboid) {
  return cuboid.maxX - cuboid.minX > 0.01 && cuboid.maxY - cuboid.minY > 0.01 && cuboid.maxZ - cuboid.minZ > 0.01;
}

function subtractCuboid(source: Cuboid, cutter: Cuboid): Cuboid[] {
  const overlap = {
    minX: Math.max(source.minX, cutter.minX),
    maxX: Math.min(source.maxX, cutter.maxX),
    minY: Math.max(source.minY, cutter.minY),
    maxY: Math.min(source.maxY, cutter.maxY),
    minZ: Math.max(source.minZ, cutter.minZ),
    maxZ: Math.min(source.maxZ, cutter.maxZ),
  };

  if (!positiveCuboid(overlap)) {
    return [source];
  }

  return [
    { ...source, maxX: overlap.minX },
    { ...source, minX: overlap.maxX },
    { minX: overlap.minX, maxX: overlap.maxX, minY: source.minY, maxY: source.maxY, minZ: source.minZ, maxZ: overlap.minZ },
    { minX: overlap.minX, maxX: overlap.maxX, minY: source.minY, maxY: source.maxY, minZ: overlap.maxZ, maxZ: source.maxZ },
    { minX: overlap.minX, maxX: overlap.maxX, minY: source.minY, maxY: overlap.minY, minZ: overlap.minZ, maxZ: overlap.maxZ },
    { minX: overlap.minX, maxX: overlap.maxX, minY: overlap.maxY, maxY: source.maxY, minZ: overlap.minZ, maxZ: overlap.maxZ },
  ].filter(positiveCuboid);
}

function cuboidsOverlap(a: Cuboid, b: Cuboid) {
  return (
    Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX) > 0.01 &&
    Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY) > 0.01 &&
    Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ) > 0.01
  );
}

function hasSolidHoleOverlap(solids: WorkplaneShape[], holes: WorkplaneShape[]) {
  const solidBounds = solids.map(meshAabb);
  const holeBounds = holes.map((hole) => meshAabb(paddedCutterShape(hole)));
  return solidBounds.some((solid) => holeBounds.some((hole) => cuboidsOverlap(solid, hole)));
}

function pointInsideCuboid(point: Vec3, cuboid: Cuboid, inset = -POINT_TOLERANCE) {
  const minX = cuboid.minX + inset;
  const maxX = cuboid.maxX - inset;
  const minY = cuboid.minY + inset;
  const maxY = cuboid.maxY - inset;
  const minZ = cuboid.minZ + inset;
  const maxZ = cuboid.maxZ - inset;
  return (
    minX <= maxX &&
    minY <= maxY &&
    minZ <= maxZ &&
    point[0] >= minX &&
    point[0] <= maxX &&
    point[1] >= minY &&
    point[1] <= maxY &&
    point[2] >= minZ &&
    point[2] <= maxZ
  );
}

/*
 * The box round a mesh or group cutter, kept per shape object. The checks below ask
 * for it once per sampled point, and for a group the mesh is rebuilt from its
 * children on every ask - three grouped threads against a 15,000-triangle import
 * meant minutes on the main thread, the page "unresponsive" (#214). Shapes are
 * never changed in place, so the box stays right for as long as the object lives.
 */
const holeShapeBoundsCache = new WeakMap<WorkplaneShape, Cuboid>();

function holeShapeBounds(shape: WorkplaneShape): Cuboid {
  const cached = holeShapeBoundsCache.get(shape);
  if (cached) return cached;
  const bounds = meshAabb(shape);
  holeShapeBoundsCache.set(shape, bounds);
  return bounds;
}

function pointInsideHoleShape(point: Vec3, shape: WorkplaneShape, strictInterior = false) {
  if (shape.importedMesh || shape.groupedShapes?.length) {
    return pointInsideCuboid(point, holeShapeBounds(shape), strictInterior ? CUTTER_RESIDUAL_INSET : -POINT_TOLERANCE);
  }

  const centerY = shape.height / 2;
  const inverse = new THREE.Matrix4()
    .makeRotationFromEuler(
      new THREE.Euler(
        THREE.MathUtils.degToRad(shape.rotationX ?? 0),
        THREE.MathUtils.degToRad(shape.rotation),
        THREE.MathUtils.degToRad(shape.rotationZ ?? 0),
        "XYZ",
      ),
    )
    .invert();
  const local = new THREE.Vector3(point[0] - shape.x, point[1] - (shape.elevation ?? 0) - centerY, point[2] - shape.z).applyMatrix4(inverse);
  const localY = local.y + centerY;
  const halfWidth = shapeWidth(shape) / 2;
  const halfDepth = shapeDepth(shape) / 2;
  if (strictInterior) {
    const yInset = Math.min(CUTTER_RESIDUAL_INSET, shape.height * 0.25);
    const xInset = Math.min(CUTTER_RESIDUAL_INSET, halfWidth * 0.25);
    const zInset = Math.min(CUTTER_RESIDUAL_INSET, halfDepth * 0.25);
    const innerHalfWidth = halfWidth - xInset;
    const innerHalfDepth = halfDepth - zInset;
    if (innerHalfWidth <= 0 || innerHalfDepth <= 0 || localY <= yInset || localY >= shape.height - yInset) {
      return false;
    }

    if (shape.kind === "cylinder" || shape.kind === "ellipse" || shape.kind === "sphere" || shape.kind === "halfSphere" || shape.kind === "cone" || shape.kind === "torus" || shape.kind === "tube" || shape.kind === "ring") {
      const nx = local.x / Math.max(POINT_TOLERANCE, innerHalfWidth);
      const nz = local.z / Math.max(POINT_TOLERANCE, innerHalfDepth);
      return nx * nx + nz * nz < 1;
    }

    return Math.abs(local.x) < innerHalfWidth && Math.abs(local.z) < innerHalfDepth;
  }

  const insideHeight = localY >= -POINT_TOLERANCE && localY <= shape.height + POINT_TOLERANCE;
  if (!insideHeight) {
    return false;
  }

  if (shape.kind === "cylinder" || shape.kind === "ellipse" || shape.kind === "sphere" || shape.kind === "halfSphere" || shape.kind === "cone" || shape.kind === "torus" || shape.kind === "tube" || shape.kind === "ring") {
    const nx = local.x / Math.max(POINT_TOLERANCE, halfWidth);
    const nz = local.z / Math.max(POINT_TOLERANCE, halfDepth);
    return nx * nx + nz * nz <= 1.0001;
  }

  return Math.abs(local.x) <= halfWidth + POINT_TOLERANCE && Math.abs(local.z) <= halfDepth + POINT_TOLERANCE;
}

function triangleCentroid([a, b, c]: Vec3[]): Vec3 {
  return [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
}

function midpoint(a: Vec3, b: Vec3): Vec3 {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
}

function triangleAabb([a, b, c]: Vec3[]): Cuboid {
  return {
    minX: Math.min(a[0], b[0], c[0]),
    maxX: Math.max(a[0], b[0], c[0]),
    minY: Math.min(a[1], b[1], c[1]),
    maxY: Math.max(a[1], b[1], c[1]),
    minZ: Math.min(a[2], b[2], c[2]),
    maxZ: Math.max(a[2], b[2], c[2]),
  };
}

function cuboidsTouch(a: Cuboid, b: Cuboid, tolerance = 0.0001) {
  return (
    Math.min(a.maxX, b.maxX) + tolerance >= Math.max(a.minX, b.minX) &&
    Math.min(a.maxY, b.maxY) + tolerance >= Math.max(a.minY, b.minY) &&
    Math.min(a.maxZ, b.maxZ) + tolerance >= Math.max(a.minZ, b.minZ)
  );
}

function triangleTouchesHoleShape(triangle: Vec3[], hole: WorkplaneShape, holeBounds: Cuboid) {
  const bounds = triangleAabb(triangle);
  if (!cuboidsTouch(bounds, holeBounds)) {
    return false;
  }

  const [a, b, c] = triangle;
  const samples = [a, b, c, triangleCentroid(triangle), midpoint(a, b), midpoint(b, c), midpoint(c, a)];
  if (samples.some((point) => pointInsideHoleShape(point, hole))) {
    return true;
  }

  // Imported STLs are often open triangle soups. A cutter can cross a small triangle
  // without catching any sampled point, so tiny overlapping triangles are clipped too.
  const triangleSpan = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY, bounds.maxZ - bounds.minZ);
  const cutterSpan = Math.max(holeBounds.maxX - holeBounds.minX, holeBounds.maxY - holeBounds.minY, holeBounds.maxZ - holeBounds.minZ);
  return triangleSpan <= cutterSpan * 0.35;
}

function cutterTouchedTriangleCount(mesh: MeshData, cutters: WorkplaneShape[]) {
  const cutterInfo = cutters.map((cutter) => ({ shape: cutter, bounds: meshAabb(cutter) }));
  return mesh.faces.reduce((total, [ai, bi, ci]) => {
    const triangle = [mesh.vertices[ai], mesh.vertices[bi], mesh.vertices[ci]];
    return total + (cutterInfo.some((cutter) => triangleTouchesHoleShape(triangle, cutter.shape, cutter.bounds)) ? 1 : 0);
  }, 0);
}

function isAxisAlignedBoxCutter(shape: WorkplaneShape) {
  const rotation = Math.abs(normalizeDegrees(shape.rotation));
  const rotationX = Math.abs(normalizeDegrees(shape.rotationX ?? 0));
  const rotationZ = Math.abs(normalizeDegrees(shape.rotationZ ?? 0));
  const straightY = rotation < 0.001 || Math.abs(rotation - 180) < 0.001 || Math.abs(rotation - 360) < 0.001;
  const straightX = rotationX < 0.001 || Math.abs(rotationX - 180) < 0.001 || Math.abs(rotationX - 360) < 0.001;
  const straightZ = rotationZ < 0.001 || Math.abs(rotationZ - 180) < 0.001 || Math.abs(rotationZ - 360) < 0.001;
  // A tapered, twisted or leaning box is no longer a box: the fast paths that
  // treat it as one dropped the deformation when grouping (Eichhornkobel,
  // forum, 27.09.2026).
  return shape.kind === "box" && straightX && straightY && straightZ && !shapeHasShapeDeform(shape);
}

function cuboidsToMesh(name: string, cuboids: Cuboid[], centerX: number, centerZ: number, baseY = 0): MeshData {
  const vertices: Vec3[] = [];
  const faces: [number, number, number][] = [];

  const uniqueSorted = (values: number[]) =>
    values
      .slice()
      .sort((a, b) => a - b)
      .filter((value, index, sorted) => index === 0 || Math.abs(value - sorted[index - 1]) > 0.0001);

  const xs = uniqueSorted(cuboids.flatMap((cuboid) => [cuboid.minX, cuboid.maxX]));
  const ys = uniqueSorted(cuboids.flatMap((cuboid) => [cuboid.minY, cuboid.maxY]));
  const zs = uniqueSorted(cuboids.flatMap((cuboid) => [cuboid.minZ, cuboid.maxZ]));
  const filled = new Set<string>();
  const cellKey = (x: number, y: number, z: number) => `${x}:${y}:${z}`;

  for (let xi = 0; xi < xs.length - 1; xi += 1) {
    for (let yi = 0; yi < ys.length - 1; yi += 1) {
      for (let zi = 0; zi < zs.length - 1; zi += 1) {
        const cx = (xs[xi] + xs[xi + 1]) / 2;
        const cy = (ys[yi] + ys[yi + 1]) / 2;
        const cz = (zs[zi] + zs[zi + 1]) / 2;
        const inside = cuboids.some(
          (cuboid) =>
            cx > cuboid.minX + 0.0001 &&
            cx < cuboid.maxX - 0.0001 &&
            cy > cuboid.minY + 0.0001 &&
            cy < cuboid.maxY - 0.0001 &&
            cz > cuboid.minZ + 0.0001 &&
            cz < cuboid.maxZ - 0.0001,
        );
        if (inside) {
          filled.add(cellKey(xi, yi, zi));
        }
      }
    }
  }

  const isFilled = (x: number, y: number, z: number) => filled.has(cellKey(x, y, z));
  const addQuad = (points: Vec3[]) => {
    const offset = vertices.length;
    vertices.push(...points);
    faces.push([offset, offset + 1, offset + 2], [offset, offset + 2, offset + 3]);
  };

  for (let xi = 0; xi < xs.length - 1; xi += 1) {
    for (let yi = 0; yi < ys.length - 1; yi += 1) {
      for (let zi = 0; zi < zs.length - 1; zi += 1) {
        if (!isFilled(xi, yi, zi)) {
          continue;
        }

        const x0 = xs[xi] - centerX;
        const x1 = xs[xi + 1] - centerX;
        const y0 = ys[yi] - baseY;
        const y1 = ys[yi + 1] - baseY;
        const z0 = zs[zi] - centerZ;
        const z1 = zs[zi + 1] - centerZ;

        if (!isFilled(xi - 1, yi, zi)) addQuad([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]]);
        if (!isFilled(xi + 1, yi, zi)) addQuad([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]]);
        if (!isFilled(xi, yi - 1, zi)) addQuad([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]]);
        if (!isFilled(xi, yi + 1, zi)) addQuad([[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]]);
        if (!isFilled(xi, yi, zi - 1)) addQuad([[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]]);
        if (!isFilled(xi, yi, zi + 1)) addQuad([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]);
      }
    }
  }

  return { name, vertices, faces };
}

function booleanMeshShape(selection: WorkplaneShape[], groupChildren?: WorkplaneShape[]): WorkplaneShape | null {
  const solids = selection.filter((shape) => !shape.hole && !shape.locked);
  const holes = selection.filter((shape) => shape.hole);
  if (solids.length === 0 || holes.length === 0) {
    return null;
  }

  try {
    const sourceTriangleCount = solids.reduce((total, solid) => total + meshForShape(solid).faces.length, 0);
    const overlappingCut = hasSolidHoleOverlap(solids, holes);
    const evaluator = new Evaluator();
    evaluator.useGroups = false;
    evaluator.attributes = ["position", "normal"];
    let result = brushFromShape(solids[0]);

    solids.slice(1).forEach((solid) => {
      result = evaluator.evaluate(result, brushFromShape(solid), ADDITION);
    });

    holes.forEach((hole) => {
      result = evaluator.evaluate(result, brushFromShape(hole, true), SUBTRACTION);
    });

    const resultPositions = positionsFromGeometryDrawRange(result.geometry);
    const groupBounds = boundsForPositions(resultPositions);
    if (!groupBounds) {
      return null;
    }

    const centerX = (groupBounds.minX + groupBounds.maxX) / 2;
    const centerZ = (groupBounds.minZ + groupBounds.maxZ) / 2;
    const minY = groupBounds.minY;
    const rawWidth = Math.max(MIN_SHAPE_DIMENSION, groupBounds.maxX - groupBounds.minX);
    const rawHeight = Math.max(MIN_SHAPE_DIMENSION, groupBounds.maxY - groupBounds.minY);
    const rawDepth = Math.max(MIN_SHAPE_DIMENSION, groupBounds.maxZ - groupBounds.minZ);
    const width = cleanModelDimension(rawWidth);
    const height = cleanModelDimension(rawHeight);
    const depth = cleanModelDimension(rawDepth);
    const positions: number[] = [];

    for (let i = 0; i < resultPositions.length; i += 3) {
      positions.push(resultPositions[i] - centerX, resultPositions[i + 1] - minY, resultPositions[i + 2] - centerZ);
    }

    const firstSolid = solids[0];
    const nextTriangleCount = Math.floor(positions.length / 9);
    if (overlappingCut && Math.abs(nextTriangleCount - sourceTriangleCount) <= 1) {
      return null;
    }

    return {
      id: createLocalId("grouped-boolean"),
      name: "Group",
      kind: "mesh",
      color: firstSolid.color,
      x: centerX,
      z: centerZ,
      elevation: minY,
      size: Math.max(width, depth),
      width,
      depth,
      height,
      rotation: 0,
      importedMesh: {
        positions,
        baseWidth: rawWidth,
        baseDepth: rawDepth,
        baseHeight: rawHeight,
        triangleCount: nextTriangleCount,
        sourceFormat: "json",
      },
      groupedBaseWidth: width,
      groupedBaseDepth: depth,
      groupedBaseHeight: height,
      groupedShapes: (groupChildren ?? selection).map((shape) => cloneAsGroupChild(shape, centerX, centerZ, minY)),
      locked: false,
      hidden: false,
    };
  } catch {
    return null;
  }
}

function resultGeometryToMeshShape(
  selection: WorkplaneShape[],
  solids: WorkplaneShape[],
  geometry: THREE.BufferGeometry,
  idPrefix: string,
  groupChildren?: WorkplaneShape[],
): WorkplaneShape | null {
  const resultPositions = positionsFromGeometryDrawRange(geometry);
  const groupBounds = boundsForPositions(resultPositions);
  if (!groupBounds) {
    return null;
  }

  const centerX = (groupBounds.minX + groupBounds.maxX) / 2;
  const centerZ = (groupBounds.minZ + groupBounds.maxZ) / 2;
  const minY = groupBounds.minY;
  const rawWidth = Math.max(MIN_SHAPE_DIMENSION, groupBounds.maxX - groupBounds.minX);
  const rawHeight = Math.max(MIN_SHAPE_DIMENSION, groupBounds.maxY - groupBounds.minY);
  const rawDepth = Math.max(MIN_SHAPE_DIMENSION, groupBounds.maxZ - groupBounds.minZ);
  const width = cleanModelDimension(rawWidth);
  const height = cleanModelDimension(rawHeight);
  const depth = cleanModelDimension(rawDepth);
  const positions: number[] = [];

  for (let i = 0; i < resultPositions.length; i += 3) {
    positions.push(resultPositions[i] - centerX, resultPositions[i + 1] - minY, resultPositions[i + 2] - centerZ);
  }

  const firstSolid = solids[0];

  return {
    id: createLocalId(idPrefix),
    name: "Group",
    kind: "mesh",
    color: firstSolid.color,
    x: centerX,
    z: centerZ,
    elevation: minY,
    size: Math.max(width, depth),
    width,
    depth,
    height,
    rotation: 0,
    importedMesh: {
      positions,
      baseWidth: rawWidth,
      baseDepth: rawDepth,
      baseHeight: rawHeight,
      triangleCount: Math.floor(positions.length / 9),
      sourceFormat: "json",
    },
    groupedBaseWidth: width,
    groupedBaseDepth: depth,
    groupedBaseHeight: height,
    groupedShapes: (groupChildren ?? selection).map((shape) => cloneAsGroupChild(shape, centerX, centerZ, minY)),
    locked: false,
    hidden: false,
  };
}

function isUsableBooleanGroup(group: WorkplaneShape | null, sourceTriangleCount = 0, enforceMinimumTriangles = true) {
  if (!group?.importedMesh) {
    return false;
  }

  const positions = group.importedMesh.positions;
  const triangleCount = group.importedMesh.triangleCount;
  const dimensions = [group.width, group.height, group.depth, group.size, group.x, group.z, group.elevation ?? 0];
  if (positions.length < 9 || triangleCount < 1 || positions.some((value) => !Number.isFinite(value)) || dimensions.some((value) => !Number.isFinite(value))) {
    return false;
  }

  const minTriangles = enforceMinimumTriangles && sourceTriangleCount > 0 ? Math.max(2, Math.min(48, Math.floor(sourceTriangleCount * 0.004))) : 2;
  return triangleCount >= minTriangles && group.width > 0.01 && group.height > 0.01 && group.depth > 0.01;
}

function looksLikeUnchangedBooleanResult(group: WorkplaneShape | null, sourceTriangleCount: number, requireChanged = true) {
  if (!group?.importedMesh) {
    return true;
  }

  if (!requireChanged) {
    return false;
  }

  const sameTriangles = Math.abs(group.importedMesh.triangleCount - sourceTriangleCount) <= 1;
  return sameTriangles;
}

function shapeContainsImportedMesh(shape: WorkplaneShape): boolean {
  return Boolean(shape.importedMesh) || Boolean(shape.groupedShapes?.some(shapeContainsImportedMesh));
}

function shapeIsImportedHole(shape: WorkplaneShape): boolean {
  return Boolean(shape.hole) && shapeContainsImportedMesh(shape);
}

function coplanarRescueCutterShape(shape: WorkplaneShape): WorkplaneShape {
  if (!shapeIsImportedHole(shape) || hasNonZeroRotation(shape)) {
    return shape;
  }
  return {
    ...shape,
    rotation: shape.rotation + COPLANAR_BOOLEAN_RESCUE_DEGREES,
    rotationZ: (shape.rotationZ ?? 0) + COPLANAR_BOOLEAN_RESCUE_DEGREES,
  };
}

function cloneAsGroupChild(shape: WorkplaneShape, centerX: number, centerZ: number, minY: number): WorkplaneShape {
  return {
    ...shape,
    id: derivedLocalId(shape.id, "group-child"),
    x: shape.x - centerX,
    z: shape.z - centerZ,
    elevation: (shape.elevation ?? 0) - minY,
  };
}

function mergedSolidMeshData(solids: WorkplaneShape[]) {
  const mergedSolidMesh: MeshData = { name: "ImportedBooleanSource", vertices: [], faces: [] };

  solids.forEach((solid) => {
    appendMeshData(mergedSolidMesh.vertices, mergedSolidMesh.faces, meshForShape(solid));
  });

  return mergedSolidMesh;
}

function meshDataToManifoldMesh(runtime: ManifoldToplevel, mesh: MeshData) {
  const vertProperties = new Float32Array(mesh.vertices.length * 3);
  mesh.vertices.forEach(([x, y, z], index) => {
    vertProperties[index * 3] = x;
    vertProperties[index * 3 + 1] = y;
    vertProperties[index * 3 + 2] = z;
  });

  const triVerts = new Uint32Array(mesh.faces.length * 3);
  mesh.faces.forEach(([a, b, c], index) => {
    triVerts[index * 3] = a;
    triVerts[index * 3 + 1] = b;
    triVerts[index * 3 + 2] = c;
  });

  const manifoldMesh = new runtime.Mesh({
    numProp: 3,
    vertProperties,
    triVerts,
    tolerance: 0.0001,
  });
  manifoldMesh.merge();
  return manifoldMesh;
}

function boxBoundsToManifold(runtime: ManifoldToplevel, bounds: Cuboid, created: ManifoldSolid[]) {
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const depth = bounds.maxZ - bounds.minZ;
  if (width <= 0.0001 || height <= 0.0001 || depth <= 0.0001) {
    return null;
  }

  const box = runtime.Manifold.cube([width, height, depth]);
  created.push(box);
  const moved = box.translate([bounds.minX, bounds.minY, bounds.minZ]);
  if (moved !== box && moved) {
    created.push(moved);
  }
  return moved;
}

function trackManifold<T extends ManifoldSolid | null>(created: ManifoldSolid[], value: T): T {
  if (value) {
    created.push(value);
  }
  return value;
}

function manifoldTransformFromMatrix(matrix: THREE.Matrix4) {
  return matrix.elements as unknown as Parameters<ManifoldSolid["transform"]>[0];
}

function shapeRotationQuaternion(shape: WorkplaneShape) {
  return new THREE.Quaternion().setFromEuler(
    new THREE.Euler(
      THREE.MathUtils.degToRad(shape.rotationX ?? 0),
      THREE.MathUtils.degToRad(meshYawDegrees(shape)),
      THREE.MathUtils.degToRad(shape.rotationZ ?? 0),
      "XYZ",
    ),
  );
}

function primitiveTransformMatrix(shape: WorkplaneShape, scale: THREE.Vector3, alignRotation?: THREE.Euler) {
  const center = new THREE.Vector3(shape.x, (shape.elevation ?? 0) + shape.height / 2, shape.z);
  const matrix = new THREE.Matrix4().compose(center, shapeRotationQuaternion(shape), new THREE.Vector3(1, 1, 1));
  if (alignRotation) {
    matrix.multiply(new THREE.Matrix4().makeRotationFromEuler(alignRotation));
  }
  matrix.multiply(new THREE.Matrix4().makeScale(scale.x, scale.y, scale.z));
  return matrix;
}

function transformedPrimitiveManifold(primitive: ManifoldSolid, matrix: THREE.Matrix4, created: ManifoldSolid[]) {
  trackManifold(created, primitive);
  return trackManifold(created, primitive.transform(manifoldTransformFromMatrix(matrix)));
}

function primitiveManifoldForShape(runtime: ManifoldToplevel, shape: WorkplaneShape, created: ManifoldSolid[]) {
  // Taper, twist and lean are not part of the analytic primitives; the mesh
  // carries them.
  if (shapeHasShapeDeform(shape)) {
    return null;
  }
  const width = shapeWidth(shape);
  const depth = shapeDepth(shape);
  const height = shape.height;
  if (width <= 0.0001 || depth <= 0.0001 || height <= 0.0001) {
    return null;
  }

  if (shape.kind === "box") {
    return transformedPrimitiveManifold(runtime.Manifold.cube(1, true), primitiveTransformMatrix(shape, new THREE.Vector3(width, height, depth)), created);
  }

  if (shape.kind === "sphere") {
    const { widthSegments } = sphereTessellation(shape.steps);
    return transformedPrimitiveManifold(
      runtime.Manifold.sphere(1, widthSegments),
      primitiveTransformMatrix(shape, new THREE.Vector3(width / 2, height / 2, depth / 2)),
      created,
    );
  }

  if (shape.kind === "cylinder" || shape.kind === "ellipse" || shape.kind === "cone") {
    const sides = shape.sides ?? 96;
    const topRadiusScale =
      shape.kind === "cone"
        ? shape.baseRadius
          ? (shape.topRadius ?? 0) / shape.baseRadius
          : 0
        : 1;
    return transformedPrimitiveManifold(
      runtime.Manifold.cylinder(1, 1, topRadiusScale, sides, true),
      primitiveTransformMatrix(shape, new THREE.Vector3(width / 2, depth / 2, height), new THREE.Euler(-Math.PI / 2, 0, 0, "XYZ")),
      created,
    );
  }

  return null;
}

function shapeToManifoldSolid(runtime: ManifoldToplevel, shape: WorkplaneShape, created: ManifoldSolid[], useBoxPrimitive = false) {
  if (useBoxPrimitive && isAxisAlignedBoxCutter(shape)) {
    return primitiveManifoldForShape(runtime, shape, created) ?? boxBoundsToManifold(runtime, meshAabb(shape), created);
  }

  const primitive = primitiveManifoldForShape(runtime, shape, created);
  if (primitive) {
    return primitive;
  }

  const mesh = meshDataToManifoldMesh(runtime, meshForShape(shape));
  let solid: ManifoldSolid;
  try {
    solid = runtime.Manifold.ofMesh(mesh);
  } finally {
    disposeManifold(mesh);
  }
  if (solid.status() !== "NoError") return solid;
  // A group of solids is the loose pile of its parts' surfaces, and parts that
  // overlap or lie on top of one another (a frame whose posts stand in its
  // rails) are several shells in one mesh. A cut through such a pile comes out
  // wrong, so the shells are joined into one body first.
  const normalized = unionSplitManifoldComponents(runtime, solid);
  created.push(solid, ...normalized.created);
  return normalized.solid ?? solid;
}

function shapesToManifoldUnion(runtime: ManifoldToplevel, shapes: WorkplaneShape[], created: ManifoldSolid[], useBoxPrimitive = false) {
  const parts: ManifoldSolid[] = [];
  for (const shape of shapes) {
    const part = shapeToManifoldSolid(runtime, shape, created, useBoxPrimitive);
    if (!part || part.status() !== "NoError" || part.numTri() < 1) {
      disposeManifold(part);
      return null;
    }
    parts.push(part);
    created.push(part);
  }

  if (parts.length === 0) {
    return null;
  }

  if (parts.length === 1) {
    return parts[0];
  }

  const union = runtime.Manifold.union(parts);
  created.push(union);
  return union.status() === "NoError" && union.numTri() > 0 ? union : null;
}

async function splitShapeByPlane(shape: WorkplaneShape, plane: Pick<ModelSplitPlane, "axis" | "normal" | "position">) {
  const created: ManifoldSolid[] = [];
  try {
    const runtime = await getManifoldRuntime();
    let solid = shapeToManifoldSolid(runtime, shape, created);
    if (!solid || solid.status() !== "NoError" || solid.numTri() < 1) {
      return { parts: null, error: t("split.error.notClosed", { status: solid?.status() ?? "empty" }) };
    }
    created.push(solid);
    const normalized = unionSplitManifoldComponents(runtime, solid);
    created.push(...normalized.created);
    if (!normalized.solid) {
      return { parts: null, error: t("split.error.overlapping") };
    }
    solid = normalized.solid;
    const [rawPositive, rawNegative] = solid.splitByPlane(plane.normal, plane.position);
    created.push(rawPositive, rawNegative);
    const trimmedPositive = dropSplitSlivers(runtime, rawPositive);
    const trimmedNegative = dropSplitSlivers(runtime, rawNegative);
    created.push(...trimmedPositive.created, ...trimmedNegative.created);
    const positive = trimmedPositive.solid;
    const negative = trimmedNegative.solid;
    if (
      !positive || !negative
      || positive.status() !== "NoError" || negative.status() !== "NoError"
      || positive.numTri() < 1 || negative.numTri() < 1
    ) {
      return { parts: null, error: t("split.error.emptyHalf") };
    }

    const positiveMesh = positive.getMesh();
    const negativeMesh = negative.getMesh();
    try {
      const label = splitAxisLabel(plane.axis);
      const positiveShape = splitShapeFromWorldPositions(
        shape,
        manifoldMeshToPositions(positiveMesh),
        createLocalId(`${shape.id}-split-positive`),
        `${shape.name} (${label}+)`,
      );
      const negativeShape = splitShapeFromWorldPositions(
        shape,
        manifoldMeshToPositions(negativeMesh),
        createLocalId(`${shape.id}-split-negative`),
        `${shape.name} (${label}-)`,
      );
      return positiveShape && negativeShape
        ? { parts: [canonicalizeShape(positiveShape), canonicalizeShape(negativeShape)] as [WorkplaneShape, WorkplaneShape] }
        : { parts: null, error: t("split.error.store") };
    } finally {
      disposeManifold(positiveMesh);
      disposeManifold(negativeMesh);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? "");
    return { parts: null, error: message ? t("split.error.kernel", { message }) : t("split.error.kernelUnknown") };
  } finally {
    Array.from(new Set(created)).forEach(disposeManifold);
  }
}

type SplitShapesOutcome =
  | { status: "stale" }
  | { status: "failed"; shape: WorkplaneShape; error: string }
  | { status: "done"; replacements: Map<string, WorkplaneShape[]>; splitCount: number };

/** Splits every target the plane crosses; `stillCurrent` is asked after each one. */
async function splitShapesByPlane(
  targets: readonly WorkplaneShape[],
  plane: Pick<ModelSplitPlane, "axis" | "normal" | "position">,
  stillCurrent: () => boolean,
): Promise<SplitShapesOutcome> {
  const replacements = new Map<string, WorkplaneShape[]>();
  let splitCount = 0;
  for (const shape of targets) {
    if (!splitPlaneIntersectsPoints(meshForShape(shape).vertices, plane.normal, plane.position)) continue;
    const result = await splitShapeByPlane(shape, plane);
    if (!stillCurrent()) return { status: "stale" };
    if (!result.parts) return { status: "failed", shape, error: result.error ?? t("split.error.failedDefault") };
    replacements.set(shape.id, result.parts);
    splitCount += 1;
  }
  return { status: "done", replacements, splitCount };
}

function manifoldMeshToPositions(mesh: InstanceType<ManifoldToplevel["Mesh"]>) {
  const positions: number[] = [];
  const numProp = mesh.numProp;
  for (let i = 0; i < mesh.triVerts.length; i += 1) {
    const vertexIndex = mesh.triVerts[i];
    const offset = vertexIndex * numProp;
    positions.push(mesh.vertProperties[offset], mesh.vertProperties[offset + 1], mesh.vertProperties[offset + 2]);
  }
  return positions;
}

function positionsInteriorTriangleCount(positions: number[], cutters: WorkplaneShape[], strictInterior = false) {
  let count = 0;
  for (let i = 0; i + 8 < positions.length; i += 9) {
    const centroid: Vec3 = [
      (positions[i] + positions[i + 3] + positions[i + 6]) / 3,
      (positions[i + 1] + positions[i + 4] + positions[i + 7]) / 3,
      (positions[i + 2] + positions[i + 5] + positions[i + 8]) / 3,
    ];
    if (cutters.some((cutter) => pointInsideHoleShape(centroid, cutter, strictInterior))) {
      count += 1;
    }
  }
  return count;
}

function meshPositionsToGroupShape(selection: WorkplaneShape[], solids: WorkplaneShape[], positions: number[], idPrefix: string, groupChildren?: WorkplaneShape[]): WorkplaneShape | null {
  if (positions.length < 9) {
    return null;
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }

  if (![minX, minY, minZ, maxX, maxY, maxZ].every(Number.isFinite)) {
    return null;
  }

  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const rawWidth = Math.max(MIN_SHAPE_DIMENSION, maxX - minX);
  const rawHeight = Math.max(MIN_SHAPE_DIMENSION, maxY - minY);
  const rawDepth = Math.max(MIN_SHAPE_DIMENSION, maxZ - minZ);
  const width = cleanModelDimension(rawWidth);
  const height = cleanModelDimension(rawHeight);
  const depth = cleanModelDimension(rawDepth);
  const normalizedPositions: number[] = [];
  for (let i = 0; i < positions.length; i += 3) {
    normalizedPositions.push(positions[i] - centerX, positions[i + 1] - minY, positions[i + 2] - centerZ);
  }

  const firstSolid = solids[0];
  return {
    id: createLocalId(idPrefix),
    name: "Group",
    kind: "mesh",
    color: firstSolid.color,
    x: centerX,
    z: centerZ,
    elevation: minY,
    size: Math.max(width, depth),
    width,
    depth,
    height,
    rotation: 0,
    importedMesh: {
      positions: normalizedPositions,
      baseWidth: rawWidth,
      baseDepth: rawDepth,
      baseHeight: rawHeight,
      triangleCount: Math.floor(normalizedPositions.length / 9),
      sourceFormat: "json",
    },
    groupedBaseWidth: width,
    groupedBaseDepth: depth,
    groupedBaseHeight: height,
    groupedShapes: (groupChildren ?? selection).map((shape) => cloneAsGroupChild(shape, centerX, centerZ, minY)),
    locked: false,
    hidden: false,
  };
}

function manifoldMeshToMeshData(mesh: InstanceType<ManifoldToplevel["Mesh"]>, name: string): MeshData {
  const numProp = mesh.numProp;
  const vertices: Vec3[] = [];
  for (let offset = 0; offset + 2 < mesh.vertProperties.length; offset += numProp) {
    vertices.push([mesh.vertProperties[offset], mesh.vertProperties[offset + 1], mesh.vertProperties[offset + 2]]);
  }
  const faces: [number, number, number][] = [];
  for (let offset = 0; offset + 2 < mesh.triVerts.length; offset += 3) {
    faces.push([mesh.triVerts[offset], mesh.triVerts[offset + 1], mesh.triVerts[offset + 2]]);
  }
  return { name, vertices, faces };
}

/**
 * Was sich durchdringt, wird fuer die Ausfuhr zu einem Koerper. Sonst stehen
 * zwei ineinander steckende Huellen in der Datei: der Schneider raeumt das
 * meist still auf, CGAL bricht daran ab. Getrennte Teile bleiben getrennt, und
 * wenn die Vereinigung nicht gelingt, geht die Ausfuhr trotzdem durch - nur
 * eben mit den einzelnen Koerpern und einem Hinweis.
 */
/**
 * A group of solids without holes is the loose pile of its parts' surfaces,
 * so its parts overlap each other even when nothing else does.
 */
function isPileOfSolids(shape: WorkplaneShape) {
  return Boolean(shape.groupedShapes && shape.groupedShapes.length > 1 && !shape.importedMesh);
}

async function unionOverlappingExportMeshes(shapes: WorkplaneShape[], meshes: MeshData[]) {
  const gruppen = overlappingExportClusters(meshes.map((mesh) => meshBounds(mesh.vertices)));
  if (!gruppen.some((gruppe) => gruppe.length > 1 || isPileOfSolids(shapes[gruppe[0]]))) {
    return { meshes, quellen: meshes.map((_, index) => index), verschmolzen: 0, gescheitert: 0 };
  }
  const runtime = await getManifoldRuntime().catch(() => null);
  const ergebnis: MeshData[] = [];
  // Which input shape each result stands for - a merged body takes its first
  // member, so the 3MF export can keep names and colours.
  const quellen: number[] = [];
  let verschmolzen = 0;
  let gescheitert = 0;
  for (const gruppe of gruppen) {
    if (gruppe.length === 1 && !isPileOfSolids(shapes[gruppe[0]])) {
      ergebnis.push(meshes[gruppe[0]]);
      quellen.push(gruppe[0]);
      continue;
    }
    const created: ManifoldSolid[] = [];
    let vereinigt: MeshData | null = null;
    try {
      const union = runtime ? shapesToManifoldUnion(runtime, gruppe.map((index) => shapes[index]), created, true) : null;
      if (union && union.status() === "NoError" && union.numTri() > 0) {
        vereinigt = manifoldMeshToMeshData(union.getMesh(), meshes[gruppe[0]].name);
      }
    } catch {
      vereinigt = null;
    } finally {
      Array.from(new Set(created)).forEach(disposeManifold);
    }
    if (vereinigt && vereinigt.faces.length > 0) {
      ergebnis.push(vereinigt);
      quellen.push(gruppe[0]);
      if (gruppe.length > 1) verschmolzen += gruppe.length;
    } else {
      gruppe.forEach((index) => {
        ergebnis.push(meshes[index]);
        quellen.push(index);
      });
      gescheitert += 1;
    }
  }
  return { meshes: ergebnis, quellen, verschmolzen, gescheitert };
}

/**
 * Das Volumen dessen, was eine STL enthielte: nur sichtbare Koerper, Gruppen
 * mit ihren Aussparungen verrechnet, Durchdringungen nur einmal gezaehlt.
 * Daraus schaetzt das Exportfenster Gewicht und Filament.
 */
/**
 * The bodies an export writes, with every hole left ungrouped taken out of the bodies it
 * reaches (#203) - as the view shades it, as grouping would cut it and as the STEP export
 * already did. Only the holes that go along count: with a selection, the selected ones.
 * A body cut away entirely drops out; one whose cut fails stays whole and is counted.
 */
async function exportBodiesWithLooseHoles(visible: readonly WorkplaneShape[]) {
  const solids = visible.filter((shape) => !shape.hole && !isNonSolidShapeKind(shape.kind));
  const meshes = solids.map(meshForShape);
  const holes = visible.filter((shape) => shape.hole && !isNonSolidShapeKind(shape.kind));
  const untouched = { solids, meshes, cut: solids.map(() => false), holeCutsFailed: 0 };
  if (holes.length === 0 || solids.length === 0) return untouched;
  // Padded like a grouped cut, so a hole flush with a face goes cleanly through it.
  const cutters = holes.map((hole) => meshForShape(paddedCutterShape(hole)));
  const cutterBounds = cutters.map((mesh) => meshBounds(mesh.vertices));
  const reaching = meshes.map((mesh) => {
    const bounds = meshBounds(mesh.vertices);
    return cutters.filter((_, index) => Boolean(bounds && cutterBounds[index] && boundsOverlap(bounds, cutterBounds[index]!, -1e-4)));
  });
  if (reaching.every((list) => list.length === 0)) return untouched;
  const runtime = await getManifoldRuntime().catch(() => null);
  const keptSolids: WorkplaneShape[] = [];
  const keptMeshes: MeshData[] = [];
  const keptCut: boolean[] = [];
  let holeCutsFailed = 0;
  meshes.forEach((mesh, index) => {
    const cutting = reaching[index];
    if (cutting.length === 0) {
      keptSolids.push(solids[index]);
      keptMeshes.push(mesh);
      keptCut.push(false);
      return;
    }
    const created: ManifoldSolid[] = [];
    let result: MeshData | null = null;
    let emptied = false;
    try {
      if (!runtime) throw new Error("no manifold runtime");
      const ofMesh = (source: MeshData) => {
        const manifoldMesh = meshDataToManifoldMesh(runtime, source);
        try {
          const solid = runtime.Manifold.ofMesh(manifoldMesh);
          created.push(solid);
          return solid.status() === "NoError" && solid.numTri() > 0 ? solid : null;
        } finally {
          disposeManifold(manifoldMesh);
        }
      };
      const body = ofMesh(mesh);
      const tools = cutting.map(ofMesh);
      if (body && tools.every(Boolean)) {
        const cutter = tools.length === 1 ? tools[0]! : runtime.Manifold.union(tools as ManifoldSolid[]);
        created.push(cutter);
        const rest = body.subtract(cutter);
        created.push(rest);
        if (rest.status() === "NoError") {
          if (rest.numTri() > 0) result = manifoldMeshToMeshData(rest.getMesh(), mesh.name);
          else emptied = true;
        }
      }
    } catch {
      result = null;
    } finally {
      Array.from(new Set(created)).forEach(disposeManifold);
    }
    if (emptied) return;
    if (!result) holeCutsFailed += 1;
    keptSolids.push(solids[index]);
    keptMeshes.push(result ?? mesh);
    keptCut.push(Boolean(result));
  });
  return { solids: keptSolids, meshes: keptMeshes, cut: keptCut, holeCutsFailed };
}

async function exportSolidVolume(source: readonly WorkplaneShape[]) {
  const { visible } = visibleExportShapes(source);
  const { solids, meshes: cut, holeCutsFailed } = await exportBodiesWithLooseHoles(visible);
  if (solids.length === 0) return { volumeMm3: 0, solids: 0, bodies: 0, unionFailed: 0 };
  const { meshes, gescheitert } = await unionOverlappingExportMeshes(solids, cut);
  const volumeMm3 = meshes.reduce((sum, mesh) => sum + Math.abs(closedMeshVolume(mesh.vertices, mesh.faces)), 0);
  return { volumeMm3, solids: solids.length, bodies: meshes.length, unionFailed: gescheitert + holeCutsFailed };
}

type ExportSolidVolume = Awaited<ReturnType<typeof exportSolidVolume>>;

const PRINT_MATERIAL_STORAGE_KEY = "layerling.printMaterial";

function formatEstimateNumber(value: number, digits: number) {
  return value.toLocaleString(getLanguage() === "de" ? "de-DE" : "en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/**
 * Fuer die 3MF: Farben bleiben eigene Koerper, damit der Slicer sie Filamenten
 * zuordnen kann. Gleichfarbiges wird wie bei STL verschmolzen. Wo sich zwei
 * Farben durchdringen, gewinnt die spaeter angelegte Form - ein Logo, das in
 * einer Platte steckt, schneidet sich dort seine Tasche, statt dass zwei
 * Koerper denselben Raum beanspruchen (Discussion #79).
 */
/** Die Lage der Schnittebene fuer Dateiname und Titel: auf Zehntel, ohne ueberfluessige Nullen. */
function formatSectionOffset(offset: number) {
  const rounded = Math.round(offset * 100) / 100;
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

const SECTION_SEEN_FROM_KEYS = {
  right: "camera.sectionSeenFromRight",
  top: "camera.sectionSeenFromTop",
  front: "camera.sectionSeenFromFront",
} as const;

/** Die sichtbaren Teile fuer einen Export, dazu der Satz, der die ausgeblendeten nennt. */
/** A bundle goes out as its parts, each a body of its own with its own colour; its holes cut nothing. */
function expandBundles(source: readonly WorkplaneShape[]): WorkplaneShape[] {
  return source.flatMap((shape) => (
    shape.groupOperation === "bundle" && shape.groupedShapes?.length
      ? expandBundles(restoreGroupedChildren(shape)).filter((part) => !part.hidden)
      : [shape]
  ));
}

function visibleExportShapes(source: readonly WorkplaneShape[]) {
  const shown = source.filter((shape) => !shape.hidden);
  const hidden = source.length - shown.length;
  const visible = expandBundles(shown);
  const hiddenNote = hidden === 0 ? "" : hidden === 1 ? t("status.exportHiddenSkippedOne") : t("status.exportHiddenSkippedMany", { count: hidden });
  return { visible, hiddenNote };
}

type PartColorSolid = { probe: THREE.Mesh; box: THREE.Box3; color: string };

/**
 * The parts of a group that shows each part in its own colour (Multicolor), as solids in the
 * world, ready to ask "which part is this point in" (#153). A group cut into one mesh keeps its
 * parts in the frame of that mesh, standing on its lowest point; a group of separate parts in
 * the frame its children have before the group's own size and place are applied.
 */
function multicolorExportSolids(shape: WorkplaneShape): PartColorSolid[] | null {
  if (shape.hole || !shape.groupedShapes?.length || !groupShowsPartColors(shape)) return null;
  const parts = shape.groupedShapes.filter((part) => !part.hole && !part.hidden);
  if (parts.length === 0 || new Set(parts.map((part) => part.color)).size < 2) return null;
  const imported = shape.importedMesh;
  let lowest = Number.POSITIVE_INFINITY;
  if (imported) for (let index = 1; index < imported.positions.length; index += 3) lowest = Math.min(lowest, imported.positions[index]);
  const scale = imported ? null : groupedContentScale(shape, localGroupBounds(shape.groupedShapes));
  const solids: PartColorSolid[] = [];
  parts.forEach((part) => {
    const local = meshForShape(part);
    if (local.faces.length === 0) return;
    let vertices: Vec3[];
    if (imported) {
      const flat = local.vertices.flatMap(([x, y, z]) => [x, y - (Number.isFinite(lowest) ? lowest : 0), z]);
      const resized = resizedImportedCoordinates(shape, flat);
      vertices = [];
      for (let index = 0; index + 2 < resized.length; index += 3) vertices.push([resized[index], resized[index + 1], resized[index + 2]]);
    } else {
      vertices = scaleGroupedVertices(local.vertices, scale!) as Vec3[];
    }
    const world = transformMesh({ name: local.name, vertices, faces: local.faces }, shape);
    const positions = new Float32Array(world.faces.length * 9);
    world.faces.forEach((face, faceIndex) => face.forEach((point, corner) => {
      const vertex = world.vertices[point];
      positions.set([vertex[0], vertex[1], vertex[2]], faceIndex * 9 + corner * 3);
    }));
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.computeBoundingBox();
    computeBoundsTree.call(geometry, { targetLeafSize: 12 });
    const probe = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    probe.raycast = acceleratedRaycast;
    solids.push({ probe, box: geometry.boundingBox ?? new THREE.Box3(), color: part.color });
  });
  return solids.length ? solids : null;
}

const PART_COLOR_PROBE = new THREE.Vector3(0.5773, 0.5774, 0.5775).normalize();

/**
 * A colour for every face of an exported body: the colour of the part the face belongs to,
 * found a hair inside the face. A face in no part (a body merged in with it) keeps `fallback`.
 */
function exportFaceColors(mesh: MeshData, solids: PartColorSolid[], fallback: string): string[] {
  const raycaster = new THREE.Raycaster();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const edge = new THREE.Vector3();
  const point = new THREE.Vector3();
  const near = 0.5;
  return mesh.faces.map(([ia, ib, ic]) => {
    a.fromArray(mesh.vertices[ia]);
    b.fromArray(mesh.vertices[ib]);
    c.fromArray(mesh.vertices[ic]);
    normal.subVectors(b, a).cross(edge.subVectors(c, a));
    const area = normal.length();
    if (area < 1e-12) return fallback;
    normal.divideScalar(area);
    point.addVectors(a, b).add(c).multiplyScalar(1 / 3).addScaledVector(normal, -0.02);
    for (const solid of solids) {
      if (!solid.box.containsPoint(point)) continue;
      raycaster.set(point, PART_COLOR_PROBE);
      if (raycaster.intersectObject(solid.probe, false).length % 2 === 1) return solid.color;
    }
    let best: PartColorSolid | null = null;
    let bestDistance = near;
    for (const solid of solids) {
      const distance = solid.box.distanceToPoint(point);
      if (distance <= bestDistance) {
        best = solid;
        bestDistance = distance;
      }
    }
    return best?.color ?? fallback;
  });
}

async function colorSeparatedExportMeshes(shapes: WorkplaneShape[], meshes: MeshData[]) {
  const farben = exportColorGroups(shapes.map((shape) => shape.color));
  if (farben.length <= 1) {
    return unionOverlappingExportMeshes(shapes, meshes);
  }
  const koerper: { mesh: MeshData; quelle: number; farbe: number }[] = [];
  let verschmolzen = 0;
  let gescheitert = 0;
  for (const [farbe, gruppe] of farben.entries()) {
    const teil = await unionOverlappingExportMeshes(gruppe.map((index) => shapes[index]), gruppe.map((index) => meshes[index]));
    teil.meshes.forEach((mesh, index) => koerper.push({ mesh, quelle: gruppe[teil.quellen[index]], farbe }));
    verschmolzen += teil.verschmolzen;
    gescheitert += teil.gescheitert;
  }

  const grenzen = koerper.map((entry) => meshBounds(entry.mesh.vertices));
  // Echte Durchdringung, kein blosses Beruehren: das schneidet nichts weg.
  const durchdringt = (a: number, b: number) => {
    const ka = grenzen[a];
    const kb = grenzen[b];
    return Boolean(ka && kb && boundsOverlap(ka, kb, -1e-4));
  };
  const runtime = koerper.some((_, a) => koerper.some((entry, b) => entry.farbe !== koerper[a].farbe && durchdringt(a, b)))
    ? await getManifoldRuntime().catch(() => null)
    : null;

  const ergebnis: MeshData[] = [];
  const quellen: number[] = [];
  koerper.forEach((entry, index) => {
    const schneider = koerper
      .map((other, otherIndex) => ({ other, otherIndex }))
      .filter(({ other, otherIndex }) => other.farbe !== entry.farbe && other.quelle > entry.quelle && durchdringt(index, otherIndex));
    if (schneider.length === 0 || !runtime) {
      if (schneider.length > 0) gescheitert += 1;
      ergebnis.push(entry.mesh);
      quellen.push(entry.quelle);
      return;
    }
    const created: ManifoldSolid[] = [];
    let rest: MeshData | null = null;
    let leer = false;
    try {
      const ofMesh = (mesh: MeshData) => {
        const manifoldMesh = meshDataToManifoldMesh(runtime, mesh);
        try {
          const solid = runtime.Manifold.ofMesh(manifoldMesh);
          created.push(solid);
          return solid.status() === "NoError" && solid.numTri() > 0 ? solid : null;
        } finally {
          disposeManifold(manifoldMesh);
        }
      };
      const basis = ofMesh(entry.mesh);
      const werkzeuge = schneider.map(({ other }) => ofMesh(other.mesh));
      if (basis && werkzeuge.every(Boolean)) {
        const vereinigt = werkzeuge.length === 1 ? werkzeuge[0]! : runtime.Manifold.union(werkzeuge as ManifoldSolid[]);
        created.push(vereinigt);
        const differenz = basis.subtract(vereinigt);
        created.push(differenz);
        if (differenz.status() === "NoError") {
          if (differenz.numTri() > 0) rest = manifoldMeshToMeshData(differenz.getMesh(), entry.mesh.name);
          else leer = true;
        }
      }
    } catch {
      rest = null;
    } finally {
      Array.from(new Set(created)).forEach(disposeManifold);
    }
    if (leer) return;
    if (rest && rest.faces.length > 0) {
      ergebnis.push(rest);
    } else {
      gescheitert += 1;
      ergebnis.push(entry.mesh);
    }
    quellen.push(entry.quelle);
  });
  return { meshes: ergebnis, quellen, verschmolzen, gescheitert };
}

function disposeManifold(value: unknown) {
  (value as { delete?: () => void } | null)?.delete?.();
}

async function manifoldBooleanMeshShape(selection: WorkplaneShape[], triangleLimit: number, options: { requireImported?: boolean; idPrefix?: string } = {}, groupChildren?: WorkplaneShape[]): Promise<WorkplaneShape | null> {
  // GROUPING SAFETY NOTE FOR FUTURE AGENTS:
  // Imported STL + hole grouping stays on exact boolean first. Rotated cutters
  // are validated against their real oriented volume, not their broad AABB.
  const solids = selection.filter((shape) => !shape.hole && !shape.locked);
  const holes = selection.filter((shape) => shape.hole);
  if (solids.length === 0 || holes.length === 0 || (options.requireImported !== false && !selection.some((shape) => Boolean(shape.importedMesh)))) {
    return null;
  }

  const sourceMesh = mergedSolidMeshData(solids);
  const cutterTriangleCount = holes.reduce((total, hole) => total + meshForShape(hole).faces.length, 0);
  if (sourceMesh.faces.length + cutterTriangleCount > triangleLimit) {
    return null;
  }
  const cutterShapes = holes.map(paddedCutterShape);
  const residualValidationShapes = holes;
  const sourceInteriorTriangles = cutterInteriorTriangleCount(sourceMesh, cutterShapes);
  const sourceTouchedTriangles = cutterTouchedTriangleCount(sourceMesh, cutterShapes);
  const sourceCutTriangles = Math.max(sourceInteriorTriangles, sourceTouchedTriangles);

  const created: ManifoldSolid[] = [];
  let result: ManifoldSolid | null = null;

  try {
    const runtime = await getManifoldRuntime();
    const solid = shapesToManifoldUnion(runtime, solids, created, true);
    const cutterSolid = shapesToManifoldUnion(runtime, holes.map(paddedCutterShape), created, true);
    if (!solid || !cutterSolid) {
      return null;
    }

    result = solid.subtract(cutterSolid);
    created.push(result);
    if (result.status() !== "NoError" || result.numTri() < 1) {
      return null;
    }

    const outputMesh = result.getMesh();
    const positions = manifoldMeshToPositions(outputMesh);
    const resultChanged = positionsDifferFromMeshData(positions, sourceMesh);
    if (!resultChanged) {
      return null;
    }
    const hasImportedOperand = selection.some((shape) => Boolean(shape.importedMesh));
    const canUseResidualInteriorValidation =
      !hasImportedOperand && holes.every((hole) => hole.kind === "box" && !hole.importedMesh && !hole.groupedShapes?.length);
    if (canUseResidualInteriorValidation) {
      const remainingInteriorTriangles = positionsInteriorTriangleCount(positions, residualValidationShapes, true);
      if (sourceCutTriangles > 0 && remainingInteriorTriangles > Math.max(12, Math.floor(sourceCutTriangles * 0.35))) {
        return null;
      }
    }

    const group = meshPositionsToGroupShape(selection, solids, positions, options.idPrefix ?? "grouped-manifold-cut", groupChildren);
    const usable = isUsableBooleanGroup(group, sourceMesh.faces.length);
    const changedEnough = sourceCutTriangles > 0 || !looksLikeUnchangedBooleanResult(group, sourceMesh.faces.length, true);
    if (!usable || !changedEnough) {
      return null;
    }
    return group;
  } catch {
    return null;
  } finally {
    Array.from(new Set(created)).forEach(disposeManifold);
  }
}

async function manifoldUnionMeshShape(selection: WorkplaneShape[], triangleLimit: number, groupChildren?: WorkplaneShape[]): Promise<WorkplaneShape | null> {
  const solids = selection.filter((shape) => !shape.hole && !shape.locked);
  if (solids.length < 2 || !selection.some((shape) => Boolean(shape.importedMesh))) {
    return null;
  }

  const mergedSourceMesh = mergedSolidMeshData(solids);
  if (mergedSourceMesh.faces.length > triangleLimit) {
    return null;
  }

  const created: ManifoldSolid[] = [];
  let result: ManifoldSolid | null = null;
  try {
    const runtime = await getManifoldRuntime();
    result = shapesToManifoldUnion(runtime, solids, created, true);
    if (!result) {
      return null;
    }
    if (result.status() !== "NoError" || result.numTri() < 1) {
      return null;
    }

    const outputMesh = result.getMesh();
    const positions = manifoldMeshToPositions(outputMesh);
    const group = meshPositionsToGroupShape(selection, solids, positions, "grouped-manifold-union", groupChildren);
    return isUsableBooleanGroup(group, mergedSourceMesh.faces.length, false) ? group : null;
  } catch {
    return null;
  } finally {
    Array.from(new Set(created)).forEach(disposeManifold);
  }
}

function asIntersectionGroup(group: WorkplaneShape): WorkplaneShape {
  return {
    ...group,
    name: "Intersection",
    hole: false,
  };
}

// Was miteinander geschnitten wird: entweder alle Koerper gegen alle
// Aussparungen (je Seite vereinigt, so war es seit 1.0.0) oder - ohne
// Aussparung in der Auswahl - jeder Koerper fuer sich, so dass nur bleibt,
// was alle gemeinsam haben. Die Anleitung versprach Letzteres immer schon,
// der Knopf blieb aber grau (Forum 617194).
type IntersectionPlan = {
  operands: WorkplaneShape[][];
  colorSource: WorkplaneShape[];
  children: WorkplaneShape[];
};

function intersectionPlanForSelection(groupable: WorkplaneShape[]): IntersectionPlan | null {
  const candidates = groupable.filter((shape) => !shape.locked);
  if (candidates.some((shape) => shape.hole)) {
    const booleanSelection = expandGroupsForBoolean(candidates);
    const solids = booleanSelection.filter((shape) => !shape.hole);
    const holes = booleanSelection.filter((shape) => shape.hole);
    return solids.length && holes.length ? { operands: [solids, holes], colorSource: solids, children: booleanSelection } : null;
  }
  // Eine Gruppe zaehlt hier als ein Koerper, so wie sie aussieht - also mit
  // ihren Bohrungen, nicht als lose Teile.
  return candidates.length >= 2 ? { operands: candidates.map((shape) => [shape]), colorSource: candidates, children: candidates } : null;
}

function canIntersectShapes(groupable: WorkplaneShape[]) {
  return intersectionPlanForSelection(groupable) !== null;
}

function intersectionOperandsOverlap(operands: WorkplaneShape[][]) {
  const [first, ...rest] = operands;
  return rest.every((operand) => hasSolidHoleOverlap(first, operand));
}

async function manifoldIntersectionMeshShape(plan: IntersectionPlan, triangleLimit: number): Promise<IntersectionAttempt> {
  const sourceTriangleCount = plan.children.reduce((total, shape) => total + meshForShape(shape).faces.length, 0);
  if (sourceTriangleCount > triangleLimit) {
    return { status: "unsupported" };
  }

  const created: ManifoldSolid[] = [];
  try {
    const runtime = await getManifoldRuntime();
    let result: ManifoldSolid | null = null;
    for (const operand of plan.operands) {
      const solid = shapesToManifoldUnion(runtime, operand, created, true);
      if (!solid) {
        return { status: "unsupported" };
      }
      if (!result) {
        result = solid;
        continue;
      }
      result = result.intersect(solid);
      created.push(result);
      if (result.status() !== "NoError") {
        return { status: "unsupported" };
      }
    }
    if (!result || result.numTri() < 1) {
      return { status: "empty" };
    }

    const outputMesh = result.getMesh();
    const positions = manifoldMeshToPositions(outputMesh);
    const group = meshPositionsToGroupShape(plan.children, plan.colorSource, positions, "grouped-manifold-intersection");
    return group && isUsableBooleanGroup(group, sourceTriangleCount, false)
      ? { status: "success", group: asIntersectionGroup(group) }
      : { status: "unsupported" };
  } catch {
    return { status: "unsupported" };
  } finally {
    Array.from(new Set(created)).forEach(disposeManifold);
  }
}

function bvhIntersectionMeshShape(plan: IntersectionPlan, operation: CSGOperation, idPrefix: string): IntersectionAttempt {
  // Die hohle Schnittmenge behaelt nur die Haut der ersten Seite - fuer mehr
  // als zwei Partner ist das keine Schnittmenge mehr.
  if (operation === HOLLOW_INTERSECTION && plan.operands.length !== 2) {
    return { status: "unsupported" };
  }

  try {
    const evaluator = new Evaluator();
    evaluator.useGroups = false;
    evaluator.attributes = ["position", "normal"];
    (evaluator as Evaluator & { useCDTClipping: boolean }).useCDTClipping = true;

    const operandBrushes = plan.operands.map((operand) => {
      let brush = brushFromShape(operand[0]);
      operand.slice(1).forEach((shape) => {
        brush = evaluator.evaluate(brush, brushFromShape(shape), ADDITION);
        brush.updateMatrixWorld(true);
      });
      return brush;
    });

    let result = operandBrushes[0];
    operandBrushes.slice(1).forEach((brush) => {
      result = evaluator.evaluate(result, brush, operation);
      result.updateMatrixWorld(true);
    });
    if (positionsFromGeometryDrawRange(result.geometry).length < 9) {
      return { status: "empty" };
    }

    const sourceTriangleCount = plan.operands[0].reduce((total, shape) => total + meshForShape(shape).faces.length, 0);
    const group = resultGeometryToMeshShape(plan.children, plan.colorSource, result.geometry, idPrefix);
    return group && isUsableBooleanGroup(group, sourceTriangleCount, false)
      ? { status: "success", group: asIntersectionGroup(group) }
      : { status: "unsupported" };
  } catch {
    return { status: "unsupported" };
  }
}

async function buildIntersectionShapeFromSelection(groupable: WorkplaneShape[], triangleLimit: number): Promise<IntersectionBuildResult> {
  const plan = intersectionPlanForSelection(groupable);
  if (!plan) {
    return {
      group: null,
      empty: false,
      failureNotice: t("status.selectSolidAndHole"),
    };
  }

  if (!intersectionOperandsOverlap(plan.operands)) {
    return { group: null, empty: true, failureNotice: "" };
  }

  const manifoldAttempt = await manifoldIntersectionMeshShape(plan, triangleLimit);
  if (manifoldAttempt.status === "success") {
    return { group: manifoldAttempt.group, empty: false, failureNotice: "" };
  }
  if (manifoldAttempt.status === "empty") {
    return { group: null, empty: true, failureNotice: "" };
  }

  const exactAttempt = bvhIntersectionMeshShape(plan, INTERSECTION, "grouped-intersection");
  if (exactAttempt.status === "success") {
    return { group: exactAttempt.group, empty: false, failureNotice: "" };
  }
  const hasImportedMesh = plan.children.some((shape) => Boolean(shape.importedMesh));
  if (exactAttempt.status === "empty" && !hasImportedMesh) {
    return { group: null, empty: true, failureNotice: "" };
  }

  const hollowAttempt = bvhIntersectionMeshShape(plan, HOLLOW_INTERSECTION, "grouped-hollow-intersection");
  if (hollowAttempt.status === "success") {
    return { group: hollowAttempt.group, empty: false, failureNotice: "" };
  }
  if (hollowAttempt.status === "empty" || exactAttempt.status === "empty") {
    return { group: null, empty: true, failureNotice: "" };
  }

  return {
    group: null,
    empty: false,
    failureNotice: "Could not calculate this Intersection cleanly",
  };
}

function cutterInteriorTriangleCount(mesh: MeshData, cutters: WorkplaneShape[]) {
  return mesh.faces.reduce((total, [ai, bi, ci]) => {
    const centroid = triangleCentroid([mesh.vertices[ai], mesh.vertices[bi], mesh.vertices[ci]]);
    return total + (cutters.some((cutter) => pointInsideHoleShape(centroid, cutter)) ? 1 : 0);
  }, 0);
}

function geometryInteriorTriangleCount(geometry: THREE.BufferGeometry, cutters: WorkplaneShape[], strictInterior = false) {
  const positions = positionsFromGeometryDrawRange(geometry);
  let count = 0;
  for (let i = 0; i + 8 < positions.length; i += 9) {
    const centroid: Vec3 = [
      (positions[i] + positions[i + 3] + positions[i + 6]) / 3,
      (positions[i + 1] + positions[i + 4] + positions[i + 7]) / 3,
      (positions[i + 2] + positions[i + 5] + positions[i + 8]) / 3,
    ];
    if (cutters.some((cutter) => pointInsideHoleShape(centroid, cutter, strictInterior))) {
      count += 1;
    }
  }
  return count;
}

function clearsImportedCutVolume(geometry: THREE.BufferGeometry, sourceInteriorTriangles: number, cutters: WorkplaneShape[]) {
  if (sourceInteriorTriangles <= 0 || cutters.length === 0) {
    return true;
  }

  const remainingInteriorTriangles = geometryInteriorTriangleCount(geometry, cutters, true);
  return remainingInteriorTriangles <= Math.max(4, Math.floor(sourceInteriorTriangles * 0.05));
}

function importedBooleanMeshShape(selection: WorkplaneShape[], groupChildren?: WorkplaneShape[]): WorkplaneShape | null {
  const solids = selection.filter((shape) => !shape.hole && !shape.locked);
  const holes = selection.filter((shape) => shape.hole);
  if (solids.length === 0 || holes.length === 0 || !selection.some((shape) => Boolean(shape.importedMesh))) {
    return null;
  }

  const mergedSolidMesh = mergedSolidMeshData(solids);
  const sourceTriangleCount = mergedSolidMesh.faces.length;
  const cutterTriangleCount = holes.reduce((total, hole) => total + meshForShape(hole).faces.length, 0);
  if (sourceTriangleCount + cutterTriangleCount > IMPORTED_FALLBACK_BOOLEAN_TRIANGLE_LIMIT) {
    return null;
  }

  const cutterShapes = holes.map(paddedCutterShape);
  const hasImportedHole = holes.some(shapeIsImportedHole);
  const hasStraightImportedHole = holes.some((hole) => shapeIsImportedHole(hole) && !hasNonZeroRotation(hole));
  const sourceInteriorTriangles = cutterInteriorTriangleCount(mergedSolidMesh, cutterShapes);
  const sourceTouchedTriangles = cutterTouchedTriangleCount(mergedSolidMesh, cutterShapes);
  const sourceCutTriangles = Math.max(sourceInteriorTriangles, sourceTouchedTriangles);
  const baseAttempts: Array<{ operation: CSGOperation; idPrefix: string; rescueCoplanar?: boolean }> = [
    // Imported STLs are often not watertight. Hollow subtraction still lets the hole bite into triangle meshes.
    { operation: HOLLOW_SUBTRACTION, idPrefix: "grouped-import-hollow-cut" },
    { operation: SUBTRACTION, idPrefix: "grouped-import-cut" },
  ];
  const attempts = hasStraightImportedHole
    ? [
        ...baseAttempts,
        { operation: HOLLOW_SUBTRACTION, idPrefix: "grouped-import-rescue-hollow-cut", rescueCoplanar: true },
        { operation: SUBTRACTION, idPrefix: "grouped-import-rescue-cut", rescueCoplanar: true },
      ]
    : baseAttempts;

  for (const attempt of attempts) {
    try {
      const evaluator = new Evaluator();
      evaluator.useGroups = false;
      evaluator.attributes = ["position", "normal"];
      (evaluator as Evaluator & { useCDTClipping: boolean }).useCDTClipping = true;
      let result = new Brush(geometryFromMeshData(mergedSolidMesh));
      result.updateMatrixWorld(true);

      const operationHoles = attempt.rescueCoplanar ? holes.map(coplanarRescueCutterShape) : holes;
      operationHoles.forEach((hole) => {
        result = evaluator.evaluate(result, brushFromShape(hole, true), attempt.operation);
        result.updateMatrixWorld(true);
      });

      const group = resultGeometryToMeshShape(selection, solids, result.geometry, attempt.idPrefix, groupChildren);
      const resultPositions = positionsFromGeometryDrawRange(result.geometry);
      const resultChanged = geometryDiffersFromMeshData(result.geometry, mergedSolidMesh);
      const hasOpenCutBoundary = hasImportedHole && introducesOpenCutBoundary(resultPositions, mergedSolidMesh, operationHoles.map(paddedCutterShape));
      if (
        isUsableBooleanGroup(group, sourceTriangleCount) &&
        (sourceCutTriangles > 0 ? resultChanged : !looksLikeUnchangedBooleanResult(group, sourceTriangleCount, true)) &&
        !hasOpenCutBoundary &&
        clearsImportedCutVolume(result.geometry, sourceCutTriangles, operationHoles)
      ) {
        return group;
      }
    } catch {
      // Try the next boolean operation before giving up.
    }
  }

  return null;
}

function boxedBooleanMeshShape(selection: WorkplaneShape[], groupChildren?: WorkplaneShape[]): WorkplaneShape | null {
  const solids = selection.filter((shape) => !shape.hole && shape.kind === "box" && !shape.locked);
  const holes = selection.filter((shape) => shape.hole && shape.kind === "box");
  if (solids.length === 0 || holes.length === 0) {
    return null;
  }

  const cutters = holes.map((hole) => shapeAabb(paddedCutterShape(hole)));
  const cuboids = solids.flatMap((solid) => cutters.reduce<Cuboid[]>((parts, cutter) => parts.flatMap((part) => subtractCuboid(part, cutter)), [shapeAabb(solid)]));
  if (cuboids.length === 0) {
    return null;
  }

  const groupBounds = boundsForCuboids(cuboids);
  const centerX = (groupBounds.minX + groupBounds.maxX) / 2;
  const centerZ = (groupBounds.minZ + groupBounds.maxZ) / 2;
  const width = Math.max(MIN_SHAPE_DIMENSION, groupBounds.maxX - groupBounds.minX);
  const minY = groupBounds.minY;
  const height = Math.max(MIN_SHAPE_DIMENSION, groupBounds.maxY - groupBounds.minY);
  const depth = Math.max(MIN_SHAPE_DIMENSION, groupBounds.maxZ - groupBounds.minZ);
  const mesh = cuboidsToMesh("Group", cuboids, centerX, centerZ, minY);
  const positions = mesh.faces.flatMap(([ai, bi, ci]) => [mesh.vertices[ai], mesh.vertices[bi], mesh.vertices[ci]]).flat();
  const firstSolid = solids[0];

  return {
    id: createLocalId("grouped-boolean"),
    name: "Group",
    kind: "mesh",
    color: firstSolid.color,
    x: centerX,
    z: centerZ,
    elevation: minY,
    size: Math.max(width, depth),
    width,
    depth,
    height,
    rotation: 0,
    importedMesh: {
      positions,
      baseWidth: width,
      baseDepth: depth,
      baseHeight: height,
      triangleCount: Math.floor(positions.length / 9),
      sourceFormat: "json",
    },
    groupedBaseWidth: width,
    groupedBaseDepth: depth,
    groupedBaseHeight: height,
    groupedShapes: (groupChildren ?? selection).map((shape) => cloneAsGroupChild(shape, centerX, centerZ, minY)),
    locked: false,
    hidden: false,
  };
}

function cutFullyConsumesSolids(selection: WorkplaneShape[]) {
  const solids = selection.filter((shape) => !shape.hole && !shape.locked);
  const holes = selection.filter((shape) => shape.hole).map(paddedCutterShape);
  if (solids.length === 0 || holes.length === 0) {
    return false;
  }

  const sourceMesh = mergedSolidMeshData(solids);
  if (sourceMesh.faces.length === 0 || !hasSolidHoleOverlap(solids, holes)) {
    return false;
  }

  return sourceMesh.faces.every(([ai, bi, ci]) => {
    const triangle = [sourceMesh.vertices[ai], sourceMesh.vertices[bi], sourceMesh.vertices[ci]];
    const centroid: Vec3 = [
      (triangle[0][0] + triangle[1][0] + triangle[2][0]) / 3,
      (triangle[0][1] + triangle[1][1] + triangle[2][1]) / 3,
      (triangle[0][2] + triangle[1][2] + triangle[2][2]) / 3,
    ];
    return holes.some((hole) => pointInsideHoleShape(centroid, hole));
  });
}

function mergedMeshShape(selection: WorkplaneShape[], groupChildren?: WorkplaneShape[]): WorkplaneShape | null {
  const groupable = selection.filter((shape) => !shape.locked);
  if (groupable.length < 2) {
    return null;
  }

  // Keep imported STL/SVG groups as a baked mesh. The viewport child-group path rescales children to a wrapper box.
  const vertices: Vec3[] = [];
  const faces: [number, number, number][] = [];
  groupable.map(meshForShape).forEach((mesh) => {
    appendMeshData(vertices, faces, mesh);
  });

  if (vertices.length < 3 || faces.length < 1) {
    return null;
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  vertices.forEach(([x, y, z]) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  });

  if (![minX, minY, minZ, maxX, maxY, maxZ].every(Number.isFinite)) {
    return null;
  }

  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const rawWidth = Math.max(MIN_SHAPE_DIMENSION, maxX - minX);
  const rawHeight = Math.max(MIN_SHAPE_DIMENSION, maxY - minY);
  const rawDepth = Math.max(MIN_SHAPE_DIMENSION, maxZ - minZ);
  const width = cleanModelDimension(rawWidth);
  const height = cleanModelDimension(rawHeight);
  const depth = cleanModelDimension(rawDepth);
  const positions: number[] = [];

  faces.forEach(([ai, bi, ci]) => {
    [vertices[ai], vertices[bi], vertices[ci]].forEach(([x, y, z]) => {
      positions.push(x - centerX, y - minY, z - centerZ);
    });
  });

  const firstSolid = groupable.find((shape) => !shape.hole) ?? groupable[0];
  const holeOnly = groupable.every((shape) => shape.hole);

  return {
    id: createLocalId("grouped-mesh"),
    name: "Group",
    kind: "mesh",
    color: holeOnly ? "#b8c2cc" : firstSolid.color,
    hole: holeOnly,
    x: centerX,
    z: centerZ,
    elevation: minY,
    size: Math.max(width, depth),
    width,
    depth,
    height,
    rotation: 0,
    importedMesh: {
      positions,
      baseWidth: rawWidth,
      baseDepth: rawDepth,
      baseHeight: rawHeight,
      triangleCount: faces.length,
      sourceFormat: "json",
    },
    groupedBaseWidth: width,
    groupedBaseDepth: depth,
    groupedBaseHeight: height,
    groupedShapes: (groupChildren ?? groupable).map((shape) => cloneAsGroupChild(shape, centerX, centerZ, minY)),
    locked: false,
    hidden: false,
  };
}

function groupedShape(selection: WorkplaneShape[]): WorkplaneShape | null {
  const groupable = selection.filter((shape) => !shape.locked);
  if (groupable.length < 2) {
    return null;
  }

  const groupBounds = boundsForShapes(groupable);
  const minX = groupBounds.minX;
  const maxX = groupBounds.maxX;
  const minY = groupBounds.minY;
  const maxY = groupBounds.maxY;
  const minZ = groupBounds.minZ;
  const maxZ = groupBounds.maxZ;
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const width = cleanModelDimension(Math.max(MIN_SHAPE_DIMENSION, maxX - minX));
  const depth = cleanModelDimension(Math.max(MIN_SHAPE_DIMENSION, maxZ - minZ));
  const height = cleanModelDimension(Math.max(MIN_SHAPE_DIMENSION, maxY - minY));
  const firstSolid = groupable.find((shape) => !shape.hole) ?? groupable[0];
  const holeOnly = groupable.every((shape) => shape.hole);

  return {
    id: createLocalId("group"),
    name: "Group",
    kind: "mesh",
    color: firstSolid.color,
    hole: holeOnly,
    x: centerX,
    z: centerZ,
    elevation: minY,
    size: Math.max(width, depth),
    width,
    depth,
    height,
    rotation: 0,
    groupedBaseWidth: width,
    groupedBaseDepth: depth,
    groupedBaseHeight: height,
    groupedShapes: groupable.map((shape) => cloneAsGroupChild(shape, centerX, centerZ, minY)),
    locked: false,
    hidden: false,
  };
}

function localGroupBounds(children: WorkplaneShape[]): Cuboid {
  return boundsForShapes(children);
}

function quaternionForShape(shape: { rotation: number; rotationX?: number; rotationZ?: number }) {
  return new THREE.Quaternion().setFromEuler(
    new THREE.Euler(
      THREE.MathUtils.degToRad(shape.rotationX ?? 0),
      THREE.MathUtils.degToRad(shape.rotation),
      THREE.MathUtils.degToRad(shape.rotationZ ?? 0),
      "XYZ",
    ),
  );
}

function rotationFromQuaternion(quaternion: THREE.Quaternion) {
  const euler = new THREE.Euler().setFromQuaternion(quaternion, "XYZ");
  return {
    rotationX: cleanRotationDegrees(THREE.MathUtils.radToDeg(euler.x)),
    rotation: cleanRotationDegrees(THREE.MathUtils.radToDeg(euler.y)),
    rotationZ: cleanRotationDegrees(THREE.MathUtils.radToDeg(euler.z)),
  };
}

const ARROW_KEYS: ReadonlySet<string> = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]);

function cleanShapePatch(patch: ShapeUpdatePatch): Partial<WorkplaneShape> {
  const { bakeTransform: _bakeTransform, ...rest } = patch;
  const next = { ...rest };
  if (typeof next.rotation === "number") {
    next.rotation = cleanRotationDegrees(next.rotation, 1);
  }
  if (typeof next.rotationX === "number") {
    next.rotationX = cleanRotationDegrees(next.rotationX, 1);
  }
  if (typeof next.rotationZ === "number") {
    next.rotationZ = cleanRotationDegrees(next.rotationZ, 1);
  }
  return next;
}

function restoreGroupedChildren(group: WorkplaneShape): WorkplaneShape[] {
  const children = group.groupedShapes ?? [];
  if (children.length === 0) {
    return [];
  }

  const [sx, sy, sz] = groupedContentScale(group, localGroupBounds(children));
  const groupQuaternion = quaternionForShape(group);
  const groupReflection = new THREE.Matrix4().makeScale(mirrorSign(group.mirrorX), mirrorSign(group.mirrorY), mirrorSign(group.mirrorZ));
  const groupCenter = new THREE.Vector3(group.x, (group.elevation ?? 0) + group.height / 2, group.z);

  return children.map((child) => {
    const width = shapeWidth(child) * sx;
    const depth = shapeDepth(child) * sz;
    const height = child.height * sy;
    const localCenter = new THREE.Vector3(
      child.x * sx * mirrorSign(group.mirrorX),
      (((child.elevation ?? 0) + child.height / 2) * sy - group.height / 2) * mirrorSign(group.mirrorY),
      child.z * sz * mirrorSign(group.mirrorZ),
    ).applyQuaternion(groupQuaternion);
    const worldCenter = groupCenter.clone().add(localCenter);
    const childRotationMatrix = new THREE.Matrix4()
      .makeRotationFromQuaternion(groupQuaternion)
      .multiply(groupReflection)
      .multiply(new THREE.Matrix4().makeRotationFromQuaternion(quaternionForShape(child)))
      .multiply(groupReflection);
    const childRotation = rotationFromQuaternion(new THREE.Quaternion().setFromRotationMatrix(childRotationMatrix));
    const restored: WorkplaneShape = {
      ...child,
      id: derivedLocalId(child.id, "ungroup"),
      x: worldCenter.x,
      z: worldCenter.z,
      elevation: worldCenter.y - height / 2,
      width,
      depth,
      height,
      size: resizedShapeSize(width, depth),
      rotation: childRotation.rotation,
      rotationX: childRotation.rotationX,
      rotationZ: childRotation.rotationZ,
      mirrorX: Boolean(child.mirrorX) !== Boolean(group.mirrorX) || undefined,
      mirrorY: Boolean(child.mirrorY) !== Boolean(group.mirrorY) || undefined,
      mirrorZ: Boolean(child.mirrorZ) !== Boolean(group.mirrorZ) || undefined,
      hidden: group.hidden ? true : child.hidden,
    };
    return canonicalizeShape(group.hole && !children.some((c) => c.hole) ? withHoleMode(restored, true) : restored);
  });
}

function expandGroupsForBoolean(selection: WorkplaneShape[]): WorkplaneShape[] {
  return selection.flatMap((shape) => {
    if (shape.importedMesh) {
      return [shape];
    }
    return shape.groupedShapes?.length ? restoreGroupedChildren(shape) : [shape];
  });
}

function expandGroupsForBoxBoolean(selection: WorkplaneShape[]): WorkplaneShape[] {
  return selection.flatMap((shape) => (shape.groupedShapes?.length ? restoreGroupedChildren(shape) : [shape]));
}

function canUseBoxBoolean(selection: WorkplaneShape[]) {
  return selection.every(isAxisAlignedBoxCutter);
}

function hasNonZeroRotation(shape: WorkplaneShape) {
  const rotation = Math.abs(normalizeDegrees(shape.rotation));
  const rotationX = Math.abs(normalizeDegrees(shape.rotationX ?? 0));
  const rotationZ = Math.abs(normalizeDegrees(shape.rotationZ ?? 0));
  return [rotation, rotationX, rotationZ].some((value) => value > 0.001 && Math.abs(value - 360) > 0.001);
}

/**
 * Why a cut with an imported mesh did not come about. Above the kernel's limit
 * the triangle count alone is the reason; between the two limits the kernel
 * was tried and refused the mesh, and only the fallback stopped at the count.
 */
function importedCutFailureNotice(selection: WorkplaneShape[], succeeded: boolean, triangleLimit: number) {
  const fallback = "Could not cut this imported mesh cleanly";
  if (succeeded) return fallback;
  const triangleCount = selection
    .filter((shape) => !shape.locked || shape.hole)
    .reduce((total, shape) => total + (shape.importedMesh?.triangleCount ?? meshForShape(shape).faces.length), 0);
  if (triangleCount > triangleLimit) {
    return t("status.cutTooComplex", { triangles: formatTriangleCount(triangleCount), limit: formatTriangleCount(triangleLimit) });
  }
  if (triangleCount > IMPORTED_FALLBACK_BOOLEAN_TRIANGLE_LIMIT) {
    return t("status.cutNotWatertightTooComplex", { triangles: formatTriangleCount(triangleCount), limit: formatTriangleCount(IMPORTED_FALLBACK_BOOLEAN_TRIANGLE_LIMIT) });
  }
  return fallback;
}

async function buildGroupedShapeFromSelection(groupable: WorkplaneShape[], triangleLimit: number): Promise<GroupBuildResult> {
  const booleanSelection = expandGroupsForBoolean(groupable);
  const hasSolid = booleanSelection.some((shape) => !shape.hole);
  const hasHole = booleanSelection.some((shape) => shape.hole);
  const hasImportedMesh = booleanSelection.some((shape) => Boolean(shape.importedMesh));
  const boxBooleanSelection = hasSolid && hasHole ? expandGroupsForBoxBoolean(groupable) : [];
  // Der Boolesche Kern rechnet auf der geflachten Auswahl, aber das Ergebnis
  // soll trotzdem die urspruenglichen, ungeflachten Formen als seine
  // "groupedShapes" tragen - sonst geht eine mitgebrachte Gruppe (z. B. vier
  // gruppierte Gewinde) beim Vereinigen verloren, weil sie ab da nur noch
  // als vier einzelne Kinder existiert (Forum: Gruppe verschwindet beim
  // Aufloesen einer Vereinigung, die eine Gewinde-Gruppe enthielt).
  const cleanBoxGroup = canUseBoxBoolean(boxBooleanSelection) ? boxedBooleanMeshShape(boxBooleanSelection, groupable) : null;
  const manifoldCutGroup = hasSolid && hasHole ? await manifoldBooleanMeshShape(booleanSelection, triangleLimit, { requireImported: false }, groupable) : null;
  const manifoldImportedMerge = hasImportedMesh && hasSolid && !hasHole ? await manifoldUnionMeshShape(booleanSelection, triangleLimit, groupable) : null;
  const exactImportedGroup = hasImportedMesh && hasSolid && hasHole ? manifoldCutGroup ?? importedBooleanMeshShape(booleanSelection, groupable) : null;
  const bakedImportedMerge = hasImportedMesh && !(hasSolid && hasHole) ? manifoldImportedMerge ?? mergedMeshShape(booleanSelection, groupable) : null;
  const group = hasSolid && hasHole
    ? cleanBoxGroup ??
      exactImportedGroup ??
      (hasImportedMesh
        ? null
        : manifoldCutGroup ?? booleanMeshShape(booleanSelection, groupable))
    : hasImportedMesh
      ? bakedImportedMerge ?? groupedShape(groupable)
      : groupedShape(groupable);
  const consumed = !group && hasSolid && hasHole && cutFullyConsumesSolids(booleanSelection);
  return {
    group,
    booleanSelection,
    hasSolid,
    hasHole,
    hasImportedMesh,
    consumed,
    failureNotice: hasImportedMesh && hasSolid && hasHole
      ? importedCutFailureNotice(booleanSelection, Boolean(group) || consumed, triangleLimit)
      : hasSolid && hasHole ? "Could not cut this selection" : "Could not group this selection",
  };
}

function debugShapeSummary(shape: WorkplaneShape): Record<string, unknown> {
  return {
    id: shape.id,
    name: shape.name,
    kind: shape.kind,
    hole: Boolean(shape.hole),
    x: Number(shape.x.toFixed(3)),
    z: Number(shape.z.toFixed(3)),
    elevation: Number((shape.elevation ?? 0).toFixed(3)),
    width: Number(shapeWidth(shape).toFixed(3)),
    depth: Number(shapeDepth(shape).toFixed(3)),
    height: Number(shape.height.toFixed(3)),
    rotation: Number(shape.rotation.toFixed(3)),
    rotationX: Number((shape.rotationX ?? 0).toFixed(3)),
    rotationZ: Number((shape.rotationZ ?? 0).toFixed(3)),
    mirrorX: Boolean(shape.mirrorX),
    mirrorY: Boolean(shape.mirrorY),
    mirrorZ: Boolean(shape.mirrorZ),
    importedTriangles: shape.importedMesh?.triangleCount ?? 0,
    imagePlate: shape.imagePlate ? `${shape.imagePlate.pixelWidth}x${shape.imagePlate.pixelHeight}` : null,
    edgeTreatments: shape.edgeTreatments ?? [],
    cadDisplayEdgeCount: shape.cadDisplayEdges?.length ?? null,
    cadDisplayEdgesVersion: shape.cadDisplayEdgesVersion ?? null,
    edgeResizeMode: shape.edgeResizeMode ?? "scale",
    cadBrepLength: shape.cadBrep?.length ?? 0,
    cadPrimitiveKind: shape.cadPrimitiveFrame?.kind ?? null,
    groupedCount: shape.groupedShapes?.length ?? 0,
    children: shape.groupedShapes?.map(debugShapeSummary) ?? [],
  };
}

/** A body's own pivot in the coordinates the MCP tools use for positions. */
function mcpPivotSummary(shape: WorkplaneShape) {
  const pivot = shapePivotWorld(shape);
  return pivot ? { x: Number(pivot.x.toFixed(3)), z: Number(pivot.z.toFixed(3)), elevation: Number(pivot.y.toFixed(3)) } : null;
}

/** The pivot an MCP update asks for: a point, null to clear it, undefined to leave it. */
function mcpPivotRequest(value: unknown): PivotPoint | null | undefined {
  if (value === null) return null;
  if (!value || typeof value !== "object") return undefined;
  const { x, z, elevation } = value as Record<string, unknown>;
  if (![x, z, elevation].every((part) => typeof part === "number" && Number.isFinite(part))) return undefined;
  return { x: x as number, y: elevation as number, z: z as number };
}

function compactShapeSummary(shape: WorkplaneShape, index: number) {
  const childSummary = shape.groupedShapes
    ?.map((child) => `${child.kind}${child.hole ? "H" : "S"}${child.importedMesh ? "I" : ""}`)
    .join("+");
  return [
    `${index}:${shape.kind}${shape.hole ? "H" : "S"}${shape.importedMesh ? "I" : ""}${shape.imagePlate ? "P" : ""}`,
    `g${shape.groupedShapes?.length ?? 0}`,
    `tri${shape.importedMesh?.triangleCount ?? 0}`,
    `edge${shape.edgeTreatments?.map((feature) => `${feature.kind}:${feature.amount}:${feature.edgeCount}:${feature.chamferAngle ?? ""}`).join("|") ?? ""}`,
    `viewEdges${shape.cadDisplayEdges?.length ?? "auto"}v${shape.cadDisplayEdgesVersion ?? 0}`,
    `edgeResize${shape.edgeResizeMode ?? "scale"}`,
    `brep${shape.cadBrep?.length ?? 0}`,
    `prim${shape.cadPrimitiveFrame ? `${shape.cadPrimitiveFrame.kind}:${shape.cadPrimitiveFrame.width}:${shape.cadPrimitiveFrame.depth}:${shape.cadPrimitiveFrame.height}` : ""}`,
    `p${Number(shape.x.toFixed(2))},${Number(shape.z.toFixed(2))},${Number((shape.elevation ?? 0).toFixed(2))}`,
    `d${Number(shapeWidth(shape).toFixed(2))}x${Number(shapeDepth(shape).toFixed(2))}x${Number(shape.height.toFixed(2))}`,
    `r${Number((shape.rotationX ?? 0).toFixed(1))},${Number(shape.rotation.toFixed(1))},${Number((shape.rotationZ ?? 0).toFixed(1))}`,
    `m${shape.mirrorX ? "x" : ""}${shape.mirrorY ? "y" : ""}${shape.mirrorZ ? "z" : ""}`,
    childSummary ? `c[${childSummary}]` : "c[]",
  ].join(",");
}

/** Runde Koerper, deren Seitenzahl ohne eigene Angabe der Groesse folgt. */
const MCP_FOLLOWING_SIDE_KINDS = new Set<ShapeKind>(["cylinder", "ellipse", "cone", "tube", "ring"]);

function mcpShapeSettings(shape: WorkplaneShape): Record<string, string | number | boolean> | undefined {
  const settings: Record<string, string | number | boolean> = {};
  MCP_SHAPE_SETTING_KEYS.forEach((key) => {
    const value = shape[key];
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      settings[key] = value;
    } else if (key === "bentTubeSegments" && Array.isArray(value)) {
      // Eine Liste passt nicht in die flache Auskunft; als Text geht sie
      // hinaus und wird so auch wieder angenommen.
      settings[key] = JSON.stringify(value);
    }
  });
  // Steht keine Seitenzahl im Objekt, folgt sie der Groesse. Dann gehoert hier
  // hin, wie viele Seiten gerade wirklich gezeichnet werden - und der Hinweis,
  // dass die Zahl mitwandert, sobald das Objekt waechst.
  if (MCP_FOLLOWING_SIDE_KINDS.has(shape.kind) && shape.sides === undefined) {
    settings.sides = roundSideCount(undefined, shapeWidth(shape), shapeDepth(shape));
    settings.sidesFollowSize = true;
  }
  // Ein Uebergang meldet seine Enden so, wie der Koerper sie zeigt, nicht wie sie gespeichert sind (#188).
  if (shape.kind === "loft") Object.assign(settings, mcpLoftSettings(shape));
  // Durchmesser und Steigung sagen einer KI nicht, dass hier ein G1/2 steht;
  // der Name aus dem Groessenmenue sagt es, und er laesst sich zuruecksenden.
  const threadSize = mcpThreadSizeName(shape);
  if (threadSize) settings.threadSize = threadSize;
  return Object.keys(settings).length > 0 ? settings : undefined;
}

function mcpShapeSummary(shape: WorkplaneShape): LayerlingMcpShapeSummary {
  return {
    id: shape.id,
    name: shape.name,
    kind: shape.kind,
    color: shape.color,
    hole: Boolean(shape.hole),
    locked: Boolean(shape.locked),
    hidden: Boolean(shape.hidden),
    position: {
      x: shape.x,
      z: shape.z,
      elevation: shape.elevation ?? 0,
    },
    dimensions: {
      width: shapeWidth(shape),
      depth: shapeDepth(shape),
      height: shape.height,
      size: shape.size,
    },
    rotation: {
      x: shape.rotationX ?? 0,
      y: shape.rotation,
      z: shape.rotationZ ?? 0,
    },
    mirror: {
      x: Boolean(shape.mirrorX),
      y: Boolean(shape.mirrorY),
      z: Boolean(shape.mirrorZ),
    },
    rotationPivot: mcpPivotSummary(shape),
    edgeTreatments: shape.edgeTreatments ?? [],
    settings: mcpShapeSettings(shape),
    groupedCount: shape.groupedShapes?.length ?? 0,
    importedTriangles: shape.importedMesh?.triangleCount ?? 0,
    cadDisplayEdgeCount: shape.cadDisplayEdges?.length ?? null,
    sketchPointCount: shape.sketchProfile?.points.length ?? 0,
    sketchSegmentCount: shape.sketchProfile?.segments.length ?? 0,
    ...(shape.sketchProfile && shape.sketchOperation !== "revolve"
      ? { sketchStroke: shape.sketchProfile.stroke ?? null, silhouette: Boolean(shape.sketchProfile.silhouette) }
      : {}),
    // A text's fill (#215) reads like a sketch body's: its stroke, and whether the counters are left out.
    ...(shape.kind === "text" ? { textStroke: shape.textStroke ?? null, textSilhouette: Boolean(shape.textSilhouette) } : {}),
    // A name tag's key ring hole (#215), on the layers it goes through; the bottom one carries the ear.
    ...(shape.kind === "text" && shape.textKeyring ? { textKeyring: shape.textKeyring } : {}),
    ...(shape.layeredText ? { layeredText: true } : {}),
    children: shape.groupedShapes?.map(mcpShapeSummary),
  };
}

/**
 * The sketch with the fill an MCP command asks for (#197), or null when it asks for none:
 * `stroke` as an object sets the stroke (missing values keep the current ones), null or false
 * makes it an area again; `silhouette` leaves the holes out or brings them back.
 */
function mcpSketchFillProfile(profile: SketchProfile, params: Record<string, unknown>): SketchProfile | null {
  const strokeRequested = params.stroke !== undefined;
  const silhouetteRequested = typeof params.silhouette === "boolean";
  if (!strokeRequested && !silhouetteRequested) return null;
  const next: SketchProfile = { ...profile };
  if (strokeRequested) {
    if (params.stroke === null || params.stroke === false) {
      delete next.stroke;
    } else {
      const stroke = normalizeSketchStroke({ ...DEFAULT_SKETCH_STROKE, ...profile.stroke, ...(params.stroke as object) });
      if (!stroke) throw new Error("stroke needs a width above 0, or null for an area");
      next.stroke = stroke;
    }
  }
  if (silhouetteRequested) {
    if (params.silhouette) next.silhouette = true;
    else delete next.silhouette;
  }
  return next;
}

/** A text font an MCP command names: a font of one's own by id or by name becomes its id; null for anything else. */
function mcpTextFont(value: string) {
  if (isCustomFontId(value)) return value;
  const wanted = value.trim().toLowerCase();
  return customFontList().find((font) => font.name.toLowerCase() === wanted)?.id ?? null;
}

function defaultMcpSketchProfile(width: number, depth: number): SketchProfile {
  const halfWidth = Math.max(0.01, width) / 2;
  const halfDepth = Math.max(0.01, depth) / 2;
  const pointIds = ["mcp-sketch-a", "mcp-sketch-b", "mcp-sketch-c", "mcp-sketch-d"].map((prefix) => createLocalId(prefix));
  return {
    points: [
      { id: pointIds[0], x: -halfWidth, z: -halfDepth, mode: "corner" },
      { id: pointIds[1], x: halfWidth, z: -halfDepth, mode: "corner" },
      { id: pointIds[2], x: halfWidth, z: halfDepth, mode: "corner" },
      { id: pointIds[3], x: -halfWidth, z: halfDepth, mode: "corner" },
    ],
    segments: [
      { id: createLocalId("mcp-sketch-segment"), startId: pointIds[0], endId: pointIds[1], kind: "line" },
      { id: createLocalId("mcp-sketch-segment"), startId: pointIds[1], endId: pointIds[2], kind: "line" },
      { id: createLocalId("mcp-sketch-segment"), startId: pointIds[2], endId: pointIds[3], kind: "line" },
      { id: createLocalId("mcp-sketch-segment"), startId: pointIds[3], endId: pointIds[0], kind: "line" },
    ],
    images: [],
  };
}

function mcpNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function mcpOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/**
 * Die formeigenen Werte eines Befehls, durch dieselbe Muehle gedreht wie die
 * Vorgaben im Arbeitsbereich: gleiche Grenzen, gleiche erlaubten Woerter. Was
 * dort nicht durchgeht, hat auch hier nichts verloren - sonst stuende spaeter
 * ein Wert im Paket, den der Pruefer beim Speichern ablehnt, und der ganze
 * Entwurf liesse sich nicht mehr sichern. Die Masse bleiben aussen vor, die
 * gehen ihren eigenen Weg.
 */
/**
 * Die Segmente eines gebogenen Rohrs kommen als Liste - oder als der Text, den
 * `layerling_read_scene` fuer sie ausgibt. Beides wird angenommen, damit ein
 * gelesener Wert unveraendert zurueckgeschickt werden kann.
 */
function mcpBentTubeSegments(value: unknown): unknown[] | undefined {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/** The transition's values as the body shows them, under the names a command sets them by. */
function mcpLoftSettings(shape: WorkplaneShape): Record<string, string | number> {
  const m = loftMeasures(shape);
  return {
    loftBottomOutline: m.bottomOutline, loftTopOutline: m.topOutline,
    loftBottomWidth: m.bottomWidth, loftBottomDepth: m.bottomDepth, loftTopWidth: m.topWidth, loftTopDepth: m.topDepth,
    loftBottomCorner: m.bottomCorner, loftTopCorner: m.topCorner, loftBottomSides: m.bottomSides, loftTopSides: m.topSides,
    loftOffsetX: m.offsetX, loftOffsetZ: m.offsetZ, loftWall: m.wall,
    loftTwist: m.twist, loftTiltX: m.tiltX, loftTiltZ: m.tiltZ,
  };
}

/** A command's transition values as a change of measures - the same way the settings panel takes them. */
function mcpLoftChange(params: Record<string, unknown>): Partial<LoftMeasures> {
  const change: Partial<LoftMeasures> = {};
  const outline = (value: unknown) => (value === "round" || value === "rectangle" || value === "polygon" ? value : undefined);
  const bottomOutline = outline(params.loftBottomOutline);
  const topOutline = outline(params.loftTopOutline);
  if (bottomOutline) change.bottomOutline = bottomOutline;
  if (topOutline) change.topOutline = topOutline;
  const numbers: Array<[string, keyof LoftMeasures]> = [
    ["loftBottomWidth", "bottomWidth"], ["loftBottomDepth", "bottomDepth"], ["loftTopWidth", "topWidth"], ["loftTopDepth", "topDepth"],
    ["loftBottomCorner", "bottomCorner"], ["loftTopCorner", "topCorner"], ["loftBottomSides", "bottomSides"], ["loftTopSides", "topSides"],
    ["loftOffsetX", "offsetX"], ["loftOffsetZ", "offsetZ"], ["loftWall", "wall"],
    ["loftTwist", "twist"], ["loftTiltX", "tiltX"], ["loftTiltZ", "tiltZ"],
  ];
  numbers.forEach(([param, key]) => {
    const value = mcpOptionalNumber(params[param]);
    if (value !== undefined) Object.assign(change, { [key]: value });
  });
  return change;
}

const MCP_BENT_TUBE_KEYS = ["bentTubeProfile", "bentTubeInnerProfile", "bentTubeSize", "bentTubeWall", "bentTubeQuality", "bentTubeSegments"] as const;

/**
 * Ein gebogenes Rohr bekommt seinen Rahmen aus Profil und Segmenten. Nur wer
 * Breite, Tiefe oder Hoehe ausdruecklich angibt, dehnt es darauf.
 */
function mcpBentTubePatch(shape: WorkplaneShape, params: Record<string, unknown>): Partial<WorkplaneShape> {
  const segments = mcpBentTubeSegments(params.bentTubeSegments);
  const fields = normalizedBentTubeFields({
    ...shape,
    bentTubeSegments: (segments as WorkplaneShape["bentTubeSegments"]) ?? shape.bentTubeSegments,
  });
  const natural = bentTubeNaturalDimensions(fields);
  const width = mcpOptionalNumber(params.width ?? params.size) ?? natural.width;
  const depth = mcpOptionalNumber(params.depth ?? params.size) ?? natural.depth;
  const height = mcpOptionalNumber(params.height ?? params.size) ?? natural.height;
  return { ...fields, width, depth, height, size: Math.max(width, depth) };
}

function mcpShapeCustomization(kind: ShapeKind, params: Record<string, unknown>): ShapeCustomization {
  const entry = normalizeShapeCustomizations({ [kind]: params })[kind] ?? {};
  const { width: _width, depth: _depth, height: _height, maxDimension: _maxDimension, ...settings } = entry;
  // Eine Ausnahme: Die Beschriftung darf laenger sein als eine Vorgabe im
  // Arbeitsbereich, wo 24 Zeichen reichen. Ein Schild im Entwurf traegt mehr,
  // und das Paketformat begrenzt sie nicht.
  if (kind === "text" && typeof params.text === "string" && params.text.trim()) settings.text = params.text;
  return settings;
}

/**
 * Die Verjuengung steht in keiner Formvorgabe - sie gehoert dem einzelnen
 * Koerper, kommt also nicht durch `normalizeShapeCustomizations` und braucht
 * hier ihren eigenen Weg. Ohne ihn liest ein Client die vier Werte aus, setzt
 * sie zurueck und nichts geschieht. Die Grenzen sind dieselben wie im
 * Merkmalsfeld, damit ueber die Bruecke nichts entsteht, was sich dort nicht
 * mehr einstellen laesst.
 */
function mcpTaperPatch(shape: WorkplaneShape, params: Record<string, unknown>, maxDimension: number): Partial<WorkplaneShape> {
  return shapeTaperPatch(shape, {
    topWidth: mcpOptionalNumber(params.taperTopWidth),
    topDepth: mcpOptionalNumber(params.taperTopDepth),
    bottomWidth: mcpOptionalNumber(params.taperBottomWidth),
    bottomDepth: mcpOptionalNumber(params.taperBottomDepth),
  }, maxDimension);
}

/**
 * Verdrehung und Neigung sind wie die Verjuengung Eigenschaften des einzelnen
 * Koerpers, nicht der Formvorgabe - derselbe eigene Weg wie `mcpTaperPatch`,
 * sonst nimmt die Bruecke die drei Werte zwar in ihr Schema auf, setzt sie
 * aber nie tatsaechlich am Koerper.
 */
function mcpExtrudeDeformPatch(shape: WorkplaneShape, params: Record<string, unknown>): Partial<WorkplaneShape> {
  return shapeExtrudeDeformPatch(shape, {
    twist: mcpOptionalNumber(params.extrudeTwist),
    offsetX: mcpOptionalNumber(params.extrudeTopOffsetX),
    offsetZ: mcpOptionalNumber(params.extrudeTopOffsetZ),
  });
}

/**
 * Ein Gewinde haengt an seinem Durchmesser: Breite und Tiefe gehoeren ihm, nicht
 * umgekehrt. Alle Gewindewerte gehen deshalb einmal durch `threadSettings` -
 * das ist dieselbe Pruefung wie im Merkmalsfeld - und der Platzbedarf wird neu
 * daraus gerechnet. Ohne diesen Schritt liest `canonicalizeShape` den alten
 * Rahmen als Zug am Anfasser und rechnet einen frisch gesetzten Durchmesser
 * wieder weg. Wer Breite oder Tiefe selbst angibt, meint genau das und behaelt
 * sie.
 */
function applyMcpThreadSettings(
  shape: WorkplaneShape,
  params: Record<string, unknown>,
  headFollowsStandard: boolean,
): WorkplaneShape {
  const requestedHead = mcpOptionalNumber(params.threadHeadHeight);
  const merged = threadSettings({ ...shape, threadHeadHeight: requestedHead ?? shape.threadHeadHeight });
  // Stand der Kopf auf seinem Normmass, waechst er mit dem Durchmesser mit -
  // sonst saesse nach einem Wechsel von M8 auf M5 der Kopf einer M8 auf einer
  // duenneren Schraube. Wer die Hoehe selbst angibt, behaelt sie.
  const settings = requestedHead === undefined && headFollowsStandard
    ? { ...merged, headHeight: normalizeThreadHeadHeight(defaultThreadHeadHeight(merged), merged) }
    : merged;
  const footprint = threadNaturalFootprint(settings);
  const keepFootprint = params.width !== undefined || params.depth !== undefined || params.size !== undefined;
  return {
    ...shape,
    threadRole: settings.role,
    threadHead: settings.head,
    threadHand: settings.hand,
    threadProfile: settings.profile,
    threadDiameter: settings.diameter,
    threadPitch: settings.pitch,
    threadClearance: settings.clearance,
    threadBoltClearance: settings.boltClearance,
    threadQuality: settings.quality,
    threadHeadHeight: settings.headHeight,
    threadChamfer: settings.chamfer,
    threadHeadChamfer: settings.headChamfer,
    ...(keepFootprint ? {} : {
      width: footprint.width,
      depth: footprint.depth,
      size: Math.max(footprint.width, footprint.depth),
    }),
  };
}

function mcpString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

/** A reference point as an AI sees it: x and z on the plate, elevation as the height. */
function mcpPointInfo(note: WorkplaneNote) {
  const round = (value: number) => Number(value.toFixed(4));
  return { id: note.id, x: round(note.x), z: round(note.z), elevation: round(note.y) };
}

function mcpStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
  }
  return typeof value === "string" && value.length > 0 ? [value] : [];
}

function mcpNumberArray(value: unknown): number[] {
  return Array.isArray(value) ? value.filter((entry): entry is number => typeof entry === "number" && Number.isInteger(entry)) : [];
}

function mcpFiniteNumberArray(value: unknown): number[] {
  return Array.isArray(value) ? value.filter((entry): entry is number => typeof entry === "number" && Number.isFinite(entry)) : [];
}

function readMcpEditorIdentity() {
  const storageKey = "layerling.mcp.editorIdentity";
  try {
    const existing = JSON.parse(window.sessionStorage.getItem(storageKey) ?? "null") as { editorId?: unknown; editorNumber?: unknown } | null;
    if (typeof existing?.editorId === "string" && typeof existing.editorNumber === "number") {
      return { editorId: existing.editorId, editorNumber: existing.editorNumber };
    }
  } catch {
    // Session identity is best-effort; fall through and create a new one.
  }

  const randomValues = new Uint32Array(1);
  window.crypto?.getRandomValues?.(randomValues);
  const editorNumber = 10000 + ((randomValues[0] || Math.floor(Math.random() * 90000)) % 90000);
  const editorId = window.crypto?.randomUUID?.() ?? `layerling-editor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const identity = { editorId, editorNumber };
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(identity));
  } catch {
    // Private browsing can block sessionStorage; the in-memory identity is enough for this tab.
  }
  return identity;
}

export function LayerlingEditor({
  initialAssets = [],
  initialShapes = [],
  initialHistory,
  initialHistoryIndex,
  initialSnap,
  initialWorkspace,
  initialPlacementElevation = 0,
  initialPlacementWorkplane,
  onHome,
  onOpenLylProjectFile,
  onSaveSharedProject,
  serverFileName = null,
  onProjectShapesChange,
  onProjectSnapshot,
  projectSaveFailure,
  onProjectWorkspaceChange,
  onProjectNameChange,
  onCreateProjectFromState,
  projectId,
  projectName = "Layerling design",
  projectCreatedAt = Date.now(),
  projectModifiedAt = Date.now(),
  projectRevision = 0,
  editorOpen = true,
  sharedProjectsEnabled = false,
  themePreference = "system",
  resolvedTheme = "light",
  onThemePreferenceChange,
}: {
  initialAssets?: ProjectAsset[];
  initialShapes?: WorkplaneShape[];
  initialHistory?: EditorHistoryEntry[];
  initialHistoryIndex?: number;
  initialSnap?: GridSize;
  initialWorkspace?: WorkplaneWorkspaceSettings;
  initialPlacementElevation?: number;
  initialPlacementWorkplane?: PlacementWorkplane;
  onHome?: (leaving: { itemCount: number }) => void;
  onOpenLylProjectFile?: (file: File) => Promise<{ ok: boolean; message: string } | void> | { ok: boolean; message: string } | void;
  onSaveSharedProject?: (request: { exportName: string; bytes: Uint8Array; thumbnailDataUrl: string; targetFileName?: string }) => Promise<string>;
  /** Set while the open project came from the server; then it saves back there by itself. */
  serverFileName?: string | null;
  onProjectShapesChange?: (snapshot: {
    projectId: string;
    shapes: WorkplaneShape[];
    history: EditorHistoryEntry[];
    historyIndex: number;
    assets: ProjectAsset[];
    projectName: string;
    projectCreatedAt: number;
    workspace: WorkplaneWorkspaceSettings;
    snapGrid: GridSize;
    placementElevation: number;
    placementWorkplane: PlacementWorkplane;
    sketchPlacementWorkplane: PlacementWorkplane;
  }) => void;
  onProjectSnapshot?: (snapshot: { image: string; projectId: string; shapes: number }, signal?: AbortSignal) => Promise<void> | void;
  /** The last failed autosave, so the editor can say so; `at` makes a repeat failure show again. */
  projectSaveFailure?: { message: string; at: number } | null;
  onProjectNameChange?: (name: string) => void;
  /** Legt aus einem frueheren Stand ein neues Projekt an und sagt in einem Satz, was daraus wurde. */
  onCreateProjectFromState?: (request: HistoryProjectRequest) => Promise<string>;
  onProjectWorkspaceChange?: (snapshot: {
    projectId: string;
    workspace: WorkplaneWorkspaceSettings;
    snap: GridSize;
    placementElevation?: number;
    placementWorkplane?: PlacementWorkplane;
    sketchPlacementWorkplane?: PlacementWorkplane;
  }) => void;
  projectId?: string | null;
  projectName?: string;
  projectCreatedAt?: number;
  projectModifiedAt?: number;
  projectRevision?: number;
  /** False while the overview is shown; the editor stays mounted behind it. */
  editorOpen?: boolean;
  sharedProjectsEnabled?: boolean;
  themePreference?: AppThemePreference;
  resolvedTheme?: ResolvedAppTheme;
  onThemePreferenceChange?: (preference: AppThemePreference) => void;
} = {}) {
  const initialSceneRef = useRef<WorkplaneShape[] | null>(null);
  if (initialSceneRef.current === null) {
    initialSceneRef.current = initialShapes.map(canonicalizeShape);
  }
  const initialNormalizedWorkplane = normalizePlacementWorkplane(initialPlacementWorkplane, initialPlacementElevation);
  const initialHistoryStateRef = useRef<EditorHistoryState | null>(null);
  if (initialHistoryStateRef.current === null) {
    initialHistoryStateRef.current = hydrateEditorHistoryState(
      initialSceneRef.current,
      initialHistory,
      initialHistoryIndex,
      normalizeWorkspaceSettings(initialWorkspace).historyLimit,
      notesForHistoryIndex(initialHistory, initialHistoryIndex),
      initialNormalizedWorkplane,
    );
  }
  const [shapes, setShapes] = useState<WorkplaneShape[]>(() => initialSceneRef.current as WorkplaneShape[]);
  // Die Notizen reisen im Verlauf mit, also kommen sie auch von dort - der
  // Stand, auf den der Verlauf zeigt, ist der Stand, den der Editor zeigt.
  const [notes, setNotes] = useState<WorkplaneNote[]>(() => notesForHistoryIndex(initialHistory, initialHistoryIndex));
  const [notesVisible, setNotesVisible] = useState(true);
  const [overhangsVisible, setOverhangsVisible] = useState(false);
  const overhangsVisibleRef = useRef(overhangsVisible);
  overhangsVisibleRef.current = overhangsVisible;
  const [noteMode, setNoteMode] = useState(false);
  const [projectAssets, setProjectAssets] = useState<ProjectAsset[]>(() => dedupeProjectAssets(initialAssets));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [clipboard, setClipboard] = useState<WorkplaneShape[]>([]);
  const clipboardCopiedAtRef = useRef(0);
  const [systemClipboardSupported, setSystemClipboardSupported] = useState(false);
  const [history, setHistory] = useState<EditorHistoryEntry[]>(() => (initialHistoryStateRef.current as EditorHistoryState).entries);
  const [historyIndex, setHistoryIndex] = useState(() => (initialHistoryStateRef.current as EditorHistoryState).index);
  /**
   * Der Verlaufsblick: welcher Stand gerade gezeigt wird, null ausserhalb. Er
   * aendert das Projekt nicht - die Arbeitsflaeche zeigt derweil nur einen
   * anderen Eintrag desselben Verlaufs.
   */
  const [historyViewIndex, setHistoryViewIndex] = useState<number | null>(null);
  const [historyProjectCreating, setHistoryProjectCreating] = useState(false);
  const historyViewState = useMemo(
    () => (historyViewIndex === null ? null : historyStateAt(history, historyViewIndex)),
    [history, historyViewIndex],
  );
  const historyViewStateRef = useRef(historyViewState);
  historyViewStateRef.current = historyViewState;
  const [placementWorkplane, setPlacementWorkplane] = useState<PlacementWorkplane>(
    () => workplaneForHistoryIndex(initialHistory, initialHistoryIndex, initialNormalizedWorkplane) ?? initialNormalizedWorkplane,
  );
  // Die gesetzte Ebene vorlaeufig nicht zeichnen (Forum 617200). Sie gilt
  // weiter; eine neue Ebene zeigt sich wieder.
  const [workplaneHidden, setWorkplaneHidden] = useState(false);
  const workplaneHiddenRef = useRef(false);
  workplaneHiddenRef.current = workplaneHidden;
  const placementWorkplaneKey = placementWorkplaneFingerprint(placementWorkplane);
  useEffect(() => {
    setWorkplaneHidden(false);
  }, [placementWorkplaneKey]);
  const [placementElevation, setPlacementElevation] = useState(() => {
    const resolved = workplaneForHistoryIndex(initialHistory, initialHistoryIndex, initialNormalizedWorkplane) ?? initialNormalizedWorkplane;
    return Math.abs(resolved.normal.x) < 1e-6
      && Math.abs(resolved.normal.y - 1) < 1e-6
      && Math.abs(resolved.normal.z) < 1e-6
      ? resolved.origin.y
      : Number.isFinite(initialPlacementElevation) ? initialPlacementElevation : 0;
  });
  const [workspaceSettings, setWorkspaceSettings] = useState<WorkplaneWorkspaceSettings>(() => normalizeWorkspaceSettings(initialWorkspace));
  const bedPrinter = printerPresetById(workspaceSettings.printer);
  const overhangs = useMemo(
    () => bedPrinter ? bedOverhangs(shapes, bedPrinter.width, bedPrinter.depth, bedPrinter.height) : [],
    [bedPrinter, shapes],
  );
  const overhangWarning = bedPrinter && overhangs.length > 0 ? bedOverhangMessage(overhangs, `${bedPrinter.vendor} ${bedPrinter.model}`) : null;
  const [snapGrid, setSnapGrid] = useState<GridSize>(() => normalizeSnapGrid(initialSnap));
  const [workplaneMode, setWorkplaneMode] = useState(false);
  const [topPanel, setTopPanel] = useState<TopPanel>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [outlinerOpen, setOutlinerOpen] = useState(false);
  /**
   * The groups being edited, outermost first; each next one is a part of the
   * one before. A group's parts lie loose on the workplane until "Done" groups
   * them again with the group's own id, name, colour and state, or "Cancel"
   * puts the untouched group back - always the innermost level. Which levels
   * were open is remembered for every history step (not saved with the
   * project), so undo and redo bring the bar back along with the parts.
   */
  const [openGroups, setOpenGroups] = useState<OpenGroupLevel[]>([]);
  const [openGroupBusy, setOpenGroupBusy] = useState(false);
  const openGroupsRef = useRef(openGroups);
  openGroupsRef.current = openGroups;
  const openGroupBusyRef = useRef(openGroupBusy);
  openGroupBusyRef.current = openGroupBusy;
  /** Set while opening or closing a level, whose own step is not an edit to track. */
  const openGroupTransitionRef = useRef(false);
  const openGroup = openGroups.at(-1) ?? null;
  /** The levels open at each history step, by the step's fingerprint. */
  const openGroupHistoryRef = useRef(new Map<string, OpenGroupLevel[]>());
  const setOpenGroupLevels = useCallback((levels: OpenGroupLevel[]) => {
    openGroupsRef.current = levels;
    setOpenGroups(levels);
  }, []);
  const [stepExporting, setStepExporting] = useState(false);
  const [lylExporting, setLylExporting] = useState(false);
  const [alignMode, setAlignMode] = useState(false);
  const [alignAnchorId, setAlignAnchorId] = useState<string | null>(null);
  const [alignPreview, setAlignPreview] = useState<{ axis: AlignAxis; target: AlignTarget } | null>(null);
  const [mirrorMode, setMirrorMode] = useState(false);
  const [splitSession, setSplitSession] = useState<SplitSession | null>(null);
  const [mirrorPreviewAxis, setMirrorPreviewAxis] = useState<AlignAxis | null>(null);
  // The pivot belongs to the selection it was set for; another selection
  // turns around its own centre again.
  const [rotationPivot, setRotationPivot] = useState<{ selectionKey: string; point: PivotPoint } | null>(null);
  const [pivotPickMode, setPivotPickMode] = useState(false);
  // Writes the pivot a single body carries; filled in once updateShape exists.
  const writeOwnPivotRef = useRef<(shapeId: string, value: [number, number, number] | undefined) => void>(() => {});
  const [layFlatPickMode, setLayFlatPickMode] = useState(false);
  // "Align faces": first a face of the selected body, then one of another body.
  const [mateTool, setMateTool] = useState<{
    sourceId: string;
    step: "source" | "target" | "ready";
    source: FacePick | null;
    target: FacePick | null;
    mode: MateMode;
    gap: number;
  } | null>(null);
  const [cruiseAsset, setCruiseAsset] = useState<ShapeAsset | null>(null);
  const cruiseAssetRef = useRef<ShapeAsset | null>(null);
  cruiseAssetRef.current = cruiseAsset;
  // Parts picked up with C, until a click sets them down on a face or Esc puts them back (#195).
  const [carryIds, setCarryIds] = useState<string[] | null>(null);
  const carryIdsRef = useRef<string[] | null>(null);
  carryIdsRef.current = carryIds;
  const [arrayTool, setArrayTool] = useState<ArraySettings | null>(null);
  const [scalePercentTool, setScalePercentTool] = useState<ScalePercentSettings | null>(null);
  const [scalePercentError, setScalePercentError] = useState<string | null>(null);
  const editorLanguage = useLanguage();
  // Leer heisst Ruhe: Dann steht kein Fenster auf der Arbeitsflaeche. Ein
  // „Bereit" braucht niemand zu lesen - dass nichts los ist, sieht man.
  const [notice, setNoticeText] = useState("");
  const noticeTimerRef = useRef<number | null>(null);

  /**
   * Die Statuszeile in der Fusszeile. Eine Bestaetigung - „Gewinde
   * hinzugefuegt" - hat nach ein paar Sekunden ihren Zweck erfuellt und macht
   * wieder Platz. Alles, was etwas von einem will oder schiefgegangen ist,
   * bleibt stehen, bis es abgeloest wird: Eine Aufforderung, die sich von
   * selbst zurueckzieht, ist keine.
   */
  // Fuer den Fehlerbericht: die letzten Meldungen und Fehler dieser Sitzung.
  const reportNoticesRef = useRef<BugReportEvent[]>([]);
  const reportErrorsRef = useRef<BugReportEvent[]>([]);
  useEffect(() => {
    const remember = (text: string) => {
      reportErrorsRef.current = rememberBugReportEvent(reportErrorsRef.current, text);
    };
    const onError = (event: ErrorEvent) => remember(`${event.message}${event.filename ? ` (${event.filename.split("/").pop()}:${event.lineno})` : ""}`);
    const onRejection = (event: PromiseRejectionEvent) => remember(`Unhandled: ${event.reason instanceof Error ? event.reason.message : String(event.reason)}`);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  const setNotice = useCallback((message: string, patient = false) => {
    reportNoticesRef.current = rememberBugReportEvent(reportNoticesRef.current, message);
    setNoticeText(message);
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => {
      noticeTimerRef.current = null;
      setNoticeText("");
    }, patient ? NOTICE_PATIENT_MS : NOTICE_LINGER_MS);
  }, []);

  useEffect(() => () => {
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
  }, []);
  // A failed autosave is said where the work happens, and stays a while.
  useEffect(() => {
    if (projectSaveFailure) setNotice(projectSaveFailure.message, true);
  }, [projectSaveFailure, setNotice]);

  // Die Statuszeile traegt fertigen Text, keinen Schluessel. Nach einem
  // Sprachwechsel waere die stehende Meldung ohnehin veraltet, also faellt
  // sie auf den Ruhezustand in der neuen Sprache zurueck.
  useEffect(() => {
    setNotice("");
  }, [editorLanguage, setNotice]);
  useEffect(() => {
    if (!cruiseAsset) return;
    setNotice(t("status.cruisePlace", { name: shapeAssetLabel(cruiseAsset) }), true);
  }, [cruiseAsset, editorLanguage, setNotice]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Left open on an iPad, which greys out files of types it does not know (#219).
  const projectFileAccept = useFileAccept(".lyl,.skf");
  const myShapesFileAccept = useFileAccept(".zip,.lyl,.skf");
  const importFileAccept = useFileAccept(".stl,.obj,.mtl,.zip,.3mf,.step,.stp,.svg,image/svg+xml");
  const projectFileInputRef = useRef<HTMLInputElement | null>(null);
  const insertProjectFileInputRef = useRef<HTMLInputElement | null>(null);
  const sketchImageInputRef = useRef<HTMLInputElement | null>(null);
  const booleanAutomationRunRef = useRef<string | null>(null);
  const splitRunRef = useRef(0);
  const splitProjectIdRef = useRef(projectId ?? null);
  splitProjectIdRef.current = projectId ?? null;
  const projectHydratingRef = useRef(false);
  const projectInteractionActiveRef = useRef(false);
  const pendingProjectShapesRef = useRef<WorkplaneShape[] | null>(null);
  const projectSyncTimerRef = useRef<number | null>(null);
  const heldProjectSyncTimerRef = useRef<number | null>(null);
  const lastProjectShapesSyncRef = useRef("");
  const lastProjectShapesEchoRef = useRef<string | null>(null);
  const lastProjectIdRef = useRef<string | null>(null);
  const projectSnapshotRunRef = useRef(0);
  const lastProjectSnapshotRef = useRef<ProjectThumbnailSceneKey | null>(null);
  const shapesRef = useRef(shapes);
  const notesRef = useRef(notes);
  const noteCommitTimerRef = useRef<number | null>(null);
  const projectAssetsRef = useRef(projectAssets);
  const selectedIdsRef = useRef(selectedIds);
  const workspaceSettingsRef = useRef(workspaceSettings);
  const snapGridRef = useRef(snapGrid);
  const placementElevationRef = useRef(placementElevation);
  const placementWorkplaneRef = useRef(placementWorkplane);
  const noticeRef = useRef(notice);
  const projectInfoRef = useRef({ projectId: projectId ?? null, projectName, projectCreatedAt });
  const historyIndexRef = useRef(historyIndex);
  const historyRef = useRef(history);
  const historyLimitRef = useRef(workspaceSettings.historyLimit);
  const interactionHistoryStartRef = useRef("");
  const interactionHistoryChangedRef = useRef(false);
  const interactionHistoryTimerRef = useRef<number | null>(null);
  const [projectInteractionActive, setProjectInteractionActive] = useState(false);
  const [toolbarMode, setToolbarMode] = useState<ToolbarMode>("geometry");
  const [sketchActive, setSketchActive] = useState(false);
  const [activeSketchWorkplane, setActiveSketchWorkplane] = useState<PlacementWorkplane>(
    () => normalizePlacementWorkplane(initialPlacementWorkplane, initialPlacementElevation),
  );
  const [sketchOperation, setSketchOperation] = useState<SketchOperation>("extrude");
  const [sketchRevolveSettings, setSketchRevolveSettings] = useState<SketchRevolveSettings>(() => ({ ...DEFAULT_SKETCH_REVOLVE_SETTINGS }));
  const [sketchRevolvePreview, setSketchRevolvePreview] = useState<SketchRevolveMesh | null>(null);
  const sketchRevolvePreviewRequestRef = useRef(0);
  const sketchRevolveUpdateRequestRef = useRef(new Map<string, number>());
  const sketchRevolveUpdateTimerRef = useRef(new Map<string, number>());
  const [sketchTool, setSketchTool] = useState<SketchTool>("line");
  const [sketchProfile, setSketchProfile] = useState<SketchProfile>(() => emptySketchProfile());
  const [sketchHistory, setSketchHistory] = useState<SketchProfile[]>([emptySketchProfile()]);
  const [sketchHistoryIndex, setSketchHistoryIndex] = useState(0);
  const [sketchClipboard, setSketchClipboard] = useState<SketchClipboard | null>(null);
  const sketchHistoryRef = useRef(sketchHistory);
  const sketchHistoryIndexRef = useRef(sketchHistoryIndex);
  const [sketchActivePointId, setSketchActivePointId] = useState<string | null>(null);
  const [sketchSelection, setSketchSelection] = useState<SketchSelection>(null);
  const [sketchMeasureStart, setSketchMeasureStart] = useState<SketchPoint | null>(null);
  const [sketchMeasurement, setSketchMeasurement] = useState<SketchMeasurement>(null);
  const [editingSketchShapeId, setEditingSketchShapeId] = useState<string | null>(null);
  const [sketchCornerDialog, setSketchCornerDialog] = useState<"fillet" | "chamfer" | null>(null);
  // Stroke for sketches (#154): the panel, and the stroked outline shown while drawing.
  const [sketchStrokePanelOpen, setSketchStrokePanelOpen] = useState(false);
  const [sketchStrokePreview, setSketchStrokePreview] = useState<string | null>(null);
  const selectedSketchPointId = useMemo(() => {
    if (sketchSelection?.kind === "point") return sketchSelection.id;
    if (sketchSelection?.kind === "multiple" && sketchSelection.pointIds.length === 1 && sketchSelection.segmentIds.length === 0) {
      return sketchSelection.pointIds[0];
    }
    return null;
  }, [sketchSelection]);
  const canFilletSketchPoint = useMemo(() => {
    if (!selectedSketchPointId) return false;
    return canApplySketchCornerTreatment(sketchProfile, selectedSketchPointId);
  }, [selectedSketchPointId, sketchProfile]);
  useEffect(() => {
    setSketchCornerDialog(null);
  }, [sketchSelection, sketchTool, sketchActive]);
  const [edgeModifier, setEdgeModifier] = useState<EdgeModifierSession | null>(null);
  const [shellTool, setShellTool] = useState<{ thickness: number; openings: ShellOpenings; edges: ShellEdges; busy: boolean; error: string | null } | null>(null);
  const [simplifyToolId, setSimplifyToolId] = useState<string | null>(null);
  /** The window for fonts of one's own (#customFonts), opened from a text's font select. */
  const [fontManagerOpen, setFontManagerOpen] = useState(false);
  // A font that came or went changes the font select and maybe the letters drawn: draw again.
  const [, setCustomFontRound] = useState(0);
  useEffect(() => onFontManagerRequested(() => setFontManagerOpen(true)), []);
  useEffect(() => onCustomFontsChanged(() => setCustomFontRound((round) => round + 1)), []);
  // A text with a fill mode draws plain until the 2D kernel is there, then again properly (#215).
  useEffect(() => onManifoldReady(() => setCustomFontRound((round) => round + 1)), []);
  const edgeModifierRef = useRef<EdgeModifierSession | null>(null);
  const cadModifierWorkerRef = useRef<Worker | null>(null);
  const cadModifierPendingRef = useRef(new Map<number, {
    resolve: (message: CadModifierWorkerResponse) => void;
    reject: (error: Error) => void;
    timer: number;
  }>());
  const cadModifierRequestRef = useRef(0);
  const cadModifierPrepareRef = useRef(0);
  const cadModifierLatestPreviewRef = useRef(0);
  const cadModifierBaseShapeRef = useRef<WorkplaneShape | null>(null);
  const cadModifierBaseFingerprintRef = useRef("");
  const cadModifierSourcePartsRef = useRef<WorkplaneShape[]>([]);
  const cadModifierWatchdogRef = useRef<{ requestId: number; phase: CadModifierRequestPhase; timer: number } | null>(null);
  const cadPreviewSendRef = useRef<(payload: CadPreviewPayload) => number | null>(() => null);
  const cadPreviewQueueRef = useRef(createCadPreviewQueue<CadPreviewPayload>((payload) => cadPreviewSendRef.current(payload)));
  const cadModifierWorkerRestartRef = useRef<() => Worker | null>(() => null);
  const lastMcpErrorRef = useRef<string | null>(null);
  const executeMcpCommandRef = useRef<((command: LayerlingMcpCommand) => Promise<unknown>) | null>(null);

  const clearCadModifierWatchdog = useCallback((requestId?: number) => {
    const active = cadModifierWatchdogRef.current;
    if (!active || (requestId !== undefined && active.requestId !== requestId)) return;
    window.clearTimeout(active.timer);
    cadModifierWatchdogRef.current = null;
  }, []);

  const armCadModifierWatchdog = useCallback((requestId: number, phase: CadModifierRequestPhase, timeoutMs = CAD_MODIFIER_REQUEST_TIMEOUT_MS) => {
    clearCadModifierWatchdog();
    const timer = window.setTimeout(() => {
      const active = cadModifierWatchdogRef.current;
      if (!active || active.requestId !== requestId) return;
      cadModifierWatchdogRef.current = null;
      cadModifierWorkerRef.current?.terminate();
      cadModifierWorkerRef.current = null;
      cadPreviewQueueRef.current.reset();
      cadModifierWorkerRestartRef.current();
      const message = cadModifierTimeoutMessage(phase);
      setEdgeModifier((current) => current ? {
        ...current,
        busy: false,
        prepared: false,
        preview: null,
        error: message,
      } : current);
      setNotice(message);
    }, timeoutMs);
    cadModifierWatchdogRef.current = { requestId, phase, timer };
  }, [clearCadModifierWatchdog]);

  useEffect(() => {
    let disposed = false;
    const rejectPendingRequests = (message: string) => {
      cadModifierPendingRef.current.forEach((pending) => {
        window.clearTimeout(pending.timer);
        pending.reject(new Error(message));
      });
      cadModifierPendingRef.current.clear();
    };
    const reportWorkerFailure = (worker: Worker | null) => {
      if (worker && cadModifierWorkerRef.current !== worker) return;
      clearCadModifierWatchdog();
      worker?.terminate();
      cadModifierWorkerRef.current = null;
      cadPreviewQueueRef.current.reset();
      rejectPendingRequests("The CAD worker could not start");
      const requestId = cadModifierRequestRef.current + 1;
      cadModifierRequestRef.current = requestId;
      cadModifierPrepareRef.current = requestId;
      cadModifierLatestPreviewRef.current = requestId;
      if (cadModifierBaseShapeRef.current) {
        const message = cadModifierWorkerFailureMessage();
        setEdgeModifier((current) => current ? { ...current, busy: false, prepared: false, preview: null, error: message } : current);
        setNotice(message);
      }
    };
    const createWorker = () => {
      if (disposed) return null;
      cadModifierWorkerRef.current?.terminate();
      try {
        const worker = new Worker(new URL("../workers/cadModifier.worker.ts", import.meta.url), { type: "module" });
        cadModifierWorkerRef.current = worker;
        worker.onmessage = handleWorkerMessage;
        worker.onerror = (event) => {
          event.preventDefault();
          reportWorkerFailure(worker);
        };
        worker.onmessageerror = () => reportWorkerFailure(worker);
        return worker;
      } catch {
        reportWorkerFailure(null);
        return null;
      }
    };
    function handleWorkerMessage(event: MessageEvent<CadModifierWorkerResponse>) {
      const message = event.data;
      clearCadModifierWatchdog(message.requestId);
      const pending = cadModifierPendingRef.current.get(message.requestId);
      if (pending) {
        window.clearTimeout(pending.timer);
        cadModifierPendingRef.current.delete(message.requestId);
        if (message.type === "error") {
          pending.reject(new Error(message.message));
        } else {
          pending.resolve(message);
        }
        return;
      }
      if (message.type === "ready") {
        if (message.requestId !== cadModifierPrepareRef.current) return;
        // Die Kanten bringen ihren Winkel mit; gefiltert wird erst hier. Wenn bei
        // der voreingestellten Schwelle nichts uebrig bleibt, waere die Tafel
        // stumm - dabei weiss sie, wie scharf die schaerfste Kante ist. Also
        // Schwelle dorthin senken und es sagen.
        const gesenkteSchwelle = message.selectableEdgeIds.length === 0
          ? rescueSharpAngleForEdges(message.edges, edgeModifierRef.current?.sharpAngle ?? 25)
          : null;
        setEdgeModifier((current) => current ? {
          ...current,
          edges: message.edges,
          sharpAngle: gesenkteSchwelle ?? current.sharpAngle,
          selectedEdgeIds: [],
          busy: false,
          prepared: true,
          preview: null,
          componentPreviews: [],
          error: message.selectableEdgeIds.length || gesenkteSchwelle ? null : t("edge.noManifoldEdges"),
        } : current);
        if (message.selectableEdgeIds.length) setNotice(t("status.selectHighlightedEdges"), true);
        else if (gesenkteSchwelle) setNotice(t("status.sharpAngleLowered", { angle: gesenkteSchwelle }), true);
        return;
      }
      if (message.type === "preview") {
        if (message.requestId !== cadModifierLatestPreviewRef.current) {
          cadPreviewQueueRef.current.settle(message.requestId);
          return;
        }
        const base = cadModifierBaseShapeRef.current;
        const sourceParts = cadModifierSourcePartsRef.current.length ? cadModifierSourcePartsRef.current : (base ? [base] : []);
        const rawPreview = base ? shapeFromCadMesh(base, message.positions, message.normals, message.indices, message.brep, message.deflection) : null;
        const preview = rawPreview ? {
          ...rawPreview,
          cadDisplayEdges: cadDisplayEdgesForShape(rawPreview, message.displayEdges),
          cadDisplayEdgesVersion: 2 as const,
        } : null;
        const componentPreviews = cadModifierComponentPreviews(sourceParts, message.components, message.deflection);
        setEdgeModifier((current) => current ? {
          ...current,
          preview,
          componentPreviews,
          busy: false,
          error: preview ? null : t("edge.emptyResult"),
        } : current);
        // Ein neuerer Wert kann waehrend der Rechnung eingetroffen sein - der geht jetzt raus.
        const nachgeschoben = cadPreviewQueueRef.current.settle(message.requestId);
        if (preview && nachgeschoben.status !== "sent") setNotice(t("status.edgePreviewReady"));
        return;
      }
      if (message.type === "error") {
        if (message.requestId < cadModifierLatestPreviewRef.current) {
          cadPreviewQueueRef.current.settle(message.requestId);
          return;
        }
        if (message.resetSession) {
          cadPreviewQueueRef.current.reset();
          const requestId = cadModifierRequestRef.current + 1;
          cadModifierRequestRef.current = requestId;
          cadModifierLatestPreviewRef.current = requestId;
          cadModifierPrepareRef.current = requestId;
          cadModifierBaseShapeRef.current = null;
          cadModifierBaseFingerprintRef.current = "";
          cadModifierSourcePartsRef.current = [];
          setEdgeModifier(null);
          setNotice(cadModifierUserErrorMessage(message.message) ?? message.message);
          return;
        }
        setEdgeModifier((current) => current ? { ...current, busy: false, preview: null, error: cadModifierUserErrorMessage(message.message) ?? message.message } : current);
        // Ein zu grosser Radius scheitert - der inzwischen gewaehlte kleinere darf es trotzdem versuchen.
        if (cadPreviewQueueRef.current.settle(message.requestId).status !== "sent") {
          setNotice(t("status.edgeNeedsAdjustment"), true);
        }
      }
    }
    cadModifierWorkerRestartRef.current = createWorker;
    createWorker();
    return () => {
      disposed = true;
      clearCadModifierWatchdog();
      cadModifierWorkerRestartRef.current = () => null;
      rejectPendingRequests("The CAD worker was closed");
      cadModifierWorkerRef.current?.terminate();
      cadModifierWorkerRef.current = null;
    };
  }, [clearCadModifierWatchdog]);

  const invalidateCadModifierSession = useCallback(() => {
    const wasActive = cadModifierBaseShapeRef.current !== null;
    if (!wasActive) return false;
    const hadInFlightRequest = cadModifierWatchdogRef.current !== null;
    clearCadModifierWatchdog();
    cadPreviewQueueRef.current.reset();
    const requestId = cadModifierRequestRef.current + 1;
    cadModifierRequestRef.current = requestId;
    cadModifierLatestPreviewRef.current = requestId;
    cadModifierPrepareRef.current = requestId;
    if (hadInFlightRequest) {
      cadModifierWorkerRef.current?.terminate();
      cadModifierWorkerRef.current = null;
      cadModifierWorkerRestartRef.current();
    } else {
      cadModifierWorkerRef.current?.postMessage({ type: "dispose", requestId } satisfies CadModifierWorkerRequest);
    }
    cadModifierBaseShapeRef.current = null;
    cadModifierBaseFingerprintRef.current = "";
    cadModifierSourcePartsRef.current = [];
    setEdgeModifier(null);
    return true;
  }, [clearCadModifierWatchdog]);

  useEffect(() => {
    const warmBooleanRuntime = () => {
      void getManifoldRuntime().catch(() => {
        // Allow a real grouping action to retry if an idle preload was interrupted.
        manifoldRuntimePromise = null;
      });
    };
    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(warmBooleanRuntime, { timeout: 1500 });
      return () => window.cancelIdleCallback(idleId);
    }
    const timer = globalThis.setTimeout(warmBooleanRuntime, 250);
    return () => globalThis.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const applyTitles = () => {
      document.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
        if (button.title) {
          return;
        }
        const label = button.getAttribute("aria-label") ?? button.textContent?.trim();
        if (label) {
          button.title = label.replace(/\s+/g, " ");
        }
      });
    };

    applyTitles();
    const observer = new MutationObserver(applyTitles);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-label"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setSystemClipboardSupported(Boolean(navigator.clipboard));
    const adoptShared = () => {
      const shared = readSharedClipboard();
      if (shared && shared.copiedAt >= clipboardCopiedAtRef.current) {
        clipboardCopiedAtRef.current = shared.copiedAt;
        setClipboard(shared.shapes);
      }
    };
    adoptShared();
    const onStorage = (event: StorageEvent) => {
      if (event.key === SHARED_CLIPBOARD_STORAGE_KEY) {
        adoptShared();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    shapesRef.current = shapes;
  }, [shapes]);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    projectAssetsRef.current = projectAssets;
  }, [projectAssets]);

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
    const currentHistory = historyRef.current;
    const currentIndex = Math.min(historyIndexRef.current, Math.max(0, currentHistory.length - 1));
    const currentEntry = currentHistory[currentIndex];
    if (currentEntry && currentEntry.selectedIds.join("\0") !== selectedIds.join("\0")) {
      const updated = currentHistory.map((entry, index) => index === currentIndex ? { ...entry, selectedIds: [...selectedIds] } : entry);
      historyRef.current = updated;
      setHistory(updated);
    }
  }, [selectedIds]);

  useEffect(() => {
    workspaceSettingsRef.current = workspaceSettings;
  }, [workspaceSettings]);

  useEffect(() => {
    snapGridRef.current = snapGrid;
  }, [snapGrid]);

  useEffect(() => {
    placementElevationRef.current = placementElevation;
  }, [placementElevation]);

  useEffect(() => {
    placementWorkplaneRef.current = placementWorkplane;
  }, [placementWorkplane]);

  useEffect(() => {
    noticeRef.current = notice;
  }, [notice]);

  useEffect(() => {
    projectInfoRef.current = { projectId: projectId ?? null, projectName, projectCreatedAt };
  }, [projectCreatedAt, projectId, projectName]);

  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    sketchHistoryRef.current = sketchHistory;
  }, [sketchHistory]);

  useEffect(() => {
    sketchHistoryIndexRef.current = sketchHistoryIndex;
  }, [sketchHistoryIndex]);

  useEffect(() => {
    edgeModifierRef.current = edgeModifier;
  }, [edgeModifier]);

  useEffect(() => {
    const requestId = sketchRevolvePreviewRequestRef.current + 1;
    sketchRevolvePreviewRequestRef.current = requestId;
    if (!sketchActive || sketchOperation !== "revolve" || sketchProfile.segments.length === 0) {
      setSketchRevolvePreview(null);
      return;
    }
    const timer = window.setTimeout(() => {
      void getManifoldRuntime()
        .then((runtime) => buildSketchRevolveMesh(runtime, sketchProfile, sketchRevolveSettings))
        .then((mesh) => {
          if (sketchRevolvePreviewRequestRef.current === requestId) setSketchRevolvePreview(mesh);
        })
        .catch(() => {
          if (sketchRevolvePreviewRequestRef.current === requestId) setSketchRevolvePreview(null);
        });
    }, 90);
    return () => window.clearTimeout(timer);
  }, [sketchActive, sketchOperation, sketchProfile, sketchRevolveSettings]);

  useEffect(() => {
    const nextWorkspace = normalizeWorkspaceSettings(initialWorkspace);
    workspaceSettingsRef.current = nextWorkspace;
    setWorkspaceSettings((current) => (
      workplaneSettingsFingerprint(current, snapGridRef.current) === workplaneSettingsFingerprint(nextWorkspace, snapGridRef.current)
        ? current
        : nextWorkspace
    ));
  }, [initialWorkspace]);

  useEffect(() => {
    const nextSnap = normalizeSnapGrid(initialSnap);
    snapGridRef.current = nextSnap;
    setSnapGrid((current) => (current === nextSnap ? current : nextSnap));
  }, [initialSnap]);

  const selectedShapes = useMemo(() => shapes.filter((shape) => selectedIds.includes(shape.id)), [selectedIds, shapes]);
  const selectedShape = selectedShapes.at(-1) ?? null;
  const hasSelection = selectedShapes.length > 0;
  const canSplitSelection = useMemo(
    () => selectedShapes.length > 0 && selectedShapes.every((shape) => !shape.locked && !shape.hidden && !isNonSolidShapeKind(shape.kind)),
    [selectedShapes],
  );
  const splitTargetKey = splitSession?.targetIds.join("\0") ?? "";
  const splitTargetShapes = useMemo(
    () => splitSession ? shapes.filter((shape) => splitSession.targetIds.includes(shape.id)) : [],
    [shapes, splitTargetKey],
  );
  const splitTargetPoints = useMemo(() => splitTargetShapes.flatMap((shape) => meshForShape(shape).vertices), [splitTargetShapes]);
  const splitPlane = useMemo(
    () => splitSession ? modelSplitPlane(splitTargetPoints, splitSession.axis, splitSession.position, splitSession.rotation) : null,
    [splitSession?.axis, splitSession?.position, splitSession?.rotation[0], splitSession?.rotation[1], splitTargetPoints],
  );
  // Another tool opening ends a split in progress, without a notice of its own.
  const closeSplit = useCallback(() => {
    splitRunRef.current += 1;
    setSplitSession(null);
  }, []);
  // A shape on the pointer and a tool that waits for a click cannot share the
  // click: the one taken up last wins and puts the other one down.
  const startCruise = useCallback((asset: ShapeAsset) => {
    closeSplit();
    invalidateCadModifierSession();
    setWorkplaneMode(false);
    setNoteMode(false);
    setPivotPickMode(false);
    setLayFlatPickMode(false);
    setCruiseAsset(asset);
  }, [closeSplit, invalidateCadModifierSession]);
  const stopCruise = useCallback(() => {
    if (!cruiseAssetRef.current) return;
    setCruiseAsset(null);
    setNotice("");
  }, [setNotice]);
  const modifierAvailableEdgeIds = useMemo(
    () => edgeModifier ? edgeModifier.edges.filter((edge) => selectableCadModifierEdge(edge, edgeModifier.sharpAngle)).map((edge) => edge.id) : [],
    [edgeModifier?.edges, edgeModifier?.sharpAngle],
  );
  // Alle grundsaetzlich verrundbaren Kanten, unabhaengig von der Schwelle -
  // damit eine feinere Kante im 3D-Bild sicht- und anklickbar bleibt, statt
  // erst nach manuellem Verschieben des Schiebereglers aufzutauchen.
  const modifierCandidateEdgeIds = useMemo(
    () => edgeModifier ? edgeModifier.edges.filter(cadModifierCandidateEdge).map((edge) => edge.id) : [],
    [edgeModifier?.edges],
  );
  const edgeModifierMaxAmount = useMemo(() => {
    const source = cadModifierBaseShapeRef.current ?? selectedShape;
    if (!source) return 10;
    // The largest measure, not the smallest: a vertical edge of a 10 mm thick
    // plate can take a far bigger radius than 10 mm, the plate's thickness
    // only limits the edges along it. Whether a size really fits the chosen
    // edges is the kernel's call, and it says so when it does not.
    const largestDimension = Math.max(shapeWidth(source), shapeDepth(source), source.height);
    return Math.max(MIN_EDGE_MODIFIER_AMOUNT, largestDimension * 0.99);
  }, [edgeModifier, selectedShape]);
  const selectedEdgeFeatureCount = useMemo(() => selectedShape ? edgeTreatmentFeatureCount(selectedShape) : 0, [selectedShape]);
  const selectedReversibleEdgeFeatureCount = useMemo(() => selectedShape ? reversibleEdgeTreatmentCount(selectedShape) : 0, [selectedShape]);
  const selectedEdgeHistoryOptions = useMemo(() => selectedShape ? edgeTreatmentHistoryOptions(selectedShape) : [], [selectedShape]);
  const canSeparateSelectedParts = useMemo(
    () => selectedShapes.length === 1 && Boolean(selectedShape && selectedShape.groupOperation !== "bundle" && separablePartCount(selectedShape) > 1),
    [selectedShape, selectedShapes.length],
  );
  const toggleModifierEdge = useCallback((id: number, singleEdge = false) => {
    // Nebenwirkungen (setNotice) hier im Funktionskoerper, nicht im
    // setState-Updater - der laeuft unter React StrictMode doppelt.
    const current = edgeModifierRef.current;
    if (!current || current.busy) return;
    let sharpAngle = current.sharpAngle;
    let allowed = new Set(current.edges.filter((edge) => selectableCadModifierEdge(edge, sharpAngle)).map((edge) => edge.id));
    let notice: string | null = null;
    if (!allowed.has(id)) {
      // Die angeklickte Kante ist grundsaetzlich verrundbar, liegt nur unter
      // der aktuellen Schwelle - dieselbe Rettung wie beim Vorbereiten, nur
      // gezielt fuer genau diese Kante statt fuer "irgendeine".
      const clicked = current.edges.find((edge) => edge.id === id);
      if (!clicked || !cadModifierCandidateEdge(clicked)) return;
      sharpAngle = Math.max(1, Math.min(current.sharpAngle, Math.floor(clicked.angle)));
      allowed = new Set(current.edges.filter((edge) => selectableCadModifierEdge(edge, sharpAngle)).map((edge) => edge.id));
      if (!allowed.has(id)) return;
      notice = t("status.sharpAngleLoweredForEdge", { angle: sharpAngle });
    }
    const ids = current.tangentChain && !singleEdge ? tangentCadEdgeChain(current.edges, id, allowed) : [id];
    const next = new Set(current.selectedEdgeIds);
    const remove = ids.every((edgeId) => next.has(edgeId));
    ids.forEach((edgeId) => remove ? next.delete(edgeId) : next.add(edgeId));
    setEdgeModifier((latest) => latest ? { ...latest, sharpAngle, selectedEdgeIds: [...next], preview: null, busy: next.size > 0, error: next.size ? null : t("edge.selectAtLeastOne") } : latest);
    if (notice) setNotice(notice, true);
  }, []);
  // Edges the CAD kernel will treat too: OpenCascade takes a picked edge together with every
  // edge that runs on from it smoothly, whatever was clicked (#161).
  const edgeModifierImpliedEdges = useMemo(() => {
    if (!edgeModifier?.prepared || !edgeModifier.selectedEdgeIds.length) return 0;
    const real = new Set(edgeModifier.edges.filter((edge) => cadModifierCandidateEdge(edge)).map((edge) => edge.id));
    const picked = new Set(edgeModifier.selectedEdgeIds);
    const reached = new Set<number>();
    edgeModifier.selectedEdgeIds.forEach((id) => tangentCadEdgeChain(edgeModifier.edges, id, real).forEach((edgeId) => reached.add(edgeId)));
    return [...reached].filter((edgeId) => !picked.has(edgeId)).length;
  }, [edgeModifier?.edges, edgeModifier?.prepared, edgeModifier?.selectedEdgeIds]);
  // Im Verlaufsblick wird der gezeigte Stand exportiert, ganz und ohne Auswahl.
  const exportSelectionScoped = hasSelection && !historyViewState;
  const exportTargetShapes = useMemo(
    () => (historyViewState ? historyViewState.shapes : hasSelection ? selectedShapes : shapes),
    [hasSelection, historyViewState, selectedShapes, shapes],
  );
  const exportableShapeCount = useMemo(() => exportTargetShapes.filter((shape) => !shape.hole && !shape.hidden).length, [exportTargetShapes]);
  const exportHiddenCount = useMemo(() => exportTargetShapes.filter((shape) => shape.hidden).length, [exportTargetShapes]);
  const exportHolesOnly = useMemo(() => exportTargetShapes.length > 0 && exportTargetShapes.every((shape) => shape.hole), [exportTargetShapes]);
  const exportScopeLabel = exportSelectionScoped ? "selected" : "total";
  /**
   * Der Name, den ein Export oder ein neues Projekt aus dem gezeigten Stand
   * traegt: der Projektname mit der Zeit des Standes - oder, wo ein alter
   * Verlauf keine Zeit kennt, der Name einer Kopie.
   */
  const historyViewName = useMemo(() => {
    if (!historyViewState) return projectName;
    const time = historyStateNameSuffix(historyViewState.entry.at);
    return time ? t("historyView.copyName", { name: projectName, time }) : t("dashboard.copyOf", { name: projectName });
  }, [historyViewState, projectName]);
  // The note "only the selection is exported" needs to know how much is left
  // out: the visible bodies the selection does not cover.
  const exportVisibleCount = useMemo(() => shapes.filter((shape) => !shape.hidden).length, [shapes]);
  const exportSelectedVisibleCount = useMemo(() => selectedShapes.filter((shape) => !shape.hidden).length, [selectedShapes]);
  const selectAllVisible = useCallback(() => {
    setSelectedIds(shapes.filter((shape) => !shape.hidden).map((shape) => shape.id));
    setNotice(t("status.selectedAllVisible"));
  }, [shapes]);
  const effectiveAlignAnchorId = useMemo(
    () => effectiveAlignmentAnchorId(selectedShapes, alignAnchorId),
    [alignAnchorId, selectedShapes],
  );
  const alignHandleStatuses = useMemo(() => (alignMode ? alignmentStatuses(selectedShapes, effectiveAlignAnchorId) : []), [alignMode, effectiveAlignAnchorId, selectedShapes]);
  // The copies a pattern would add, shown on the workplane until "Create".
  const arrayPreview = useMemo(
    () => (arrayTool && selectedShapes.length > 0 ? arrayCopies(selectedShapes, arrayTool) : null),
    [arrayTool, selectedShapes],
  );
  const viewportShapes = useMemo(
    () =>
      arrayPreview
        ? [...shapes, ...arrayPreview]
        : edgeModifier?.preview && cadModifierBaseShapeRef.current
        ? shapes.map((shape) => shape.id === cadModifierBaseShapeRef.current?.id ? edgeModifier.preview as WorkplaneShape : shape)
        : alignMode && alignPreview
        ? alignedShapesForSelection(shapes, selectedIds, selectedShapes, effectiveAlignAnchorId, alignPreview.axis, alignPreview.target).nextShapes
        : mirrorMode && mirrorPreviewAxis
          ? mirroredShapesForSelection(shapes, selectedIds, selectedShapes, mirrorPreviewAxis).nextShapes
          : shapes,
    [alignMode, alignPreview, arrayPreview, edgeModifier?.preview, effectiveAlignAnchorId, mirrorMode, mirrorPreviewAxis, selectedIds, selectedShapes, shapes],
  );
  const sketchReferenceShapes = useMemo(
    // Only the sketch view shows them; outside it every body would be projected for nothing.
    () => !sketchActive || sketchOperation === "revolve" || placementWorkplaneIsBase(activeSketchWorkplane)
      ? shapes
      : shapes.map((shape) => shape.hidden || shape.id === editingSketchShapeId
        ? shape
        : sketchReferenceShapeOnWorkplane(shape, activeSketchWorkplane)),
    [activeSketchWorkplane, editingSketchShapeId, shapes, sketchActive, sketchOperation],
  );
  // A workplane inside a body cuts it: the sketch view shows the outline of the cut (a hollow body
  // gives a ring), where a workplane on a face shows that face. Per body, as an SVG path in the
  // workplane's own coordinates.
  const sketchReferenceSlices = useMemo(() => {
    const slices: Record<string, string> = {};
    if (!sketchActive || sketchOperation === "revolve" || placementWorkplaneIsBase(activeSketchWorkplane)) return slices;
    shapes.forEach((shape) => {
      if (shape.hidden || shape.id === editingSketchShapeId) return;
      const mesh = meshForShape(shape);
      const vertices = mesh.vertices.map(([x, y, z]) => {
        const local = placementWorkplaneCoordinates(activeSketchWorkplane, { x, y, z });
        return { x: local.x, h: local.y, z: local.z };
      });
      if (!planeCutsMesh(vertices.map((vertex) => vertex.h))) return;
      const path = meshSlicePath(vertices, mesh.faces);
      if (path) slices[shape.id] = path;
    });
    return slices;
  }, [activeSketchWorkplane, editingSketchShapeId, shapes, sketchActive, sketchOperation]);
  const debugState = useMemo(
    () =>
      JSON.stringify({
        notice,
        selectedIds,
        shapeCount: shapes.length,
        shapes: shapes.map(debugShapeSummary),
      }),
    [notice, selectedIds, shapes],
  );
  const compactDebugState = useMemo(
    () => `notice=${notice};selected=${selectedIds.length};count=${shapes.length};${shapes.map(compactShapeSummary).join(";")}`,
    [notice, selectedIds, shapes],
  );

  useEffect(() => {
    const runId = projectSnapshotRunRef.current + 1;
    projectSnapshotRunRef.current = runId;
    if (!projectId || !onProjectSnapshot || typeof window === "undefined") {
      return;
    }
    const sceneKey = { projectId, fingerprint: projectShapesFingerprint(shapes) };
    if (lastProjectSnapshotRef.current?.projectId !== projectId || projectHydratingRef.current) {
      lastProjectSnapshotRef.current = sceneKey;
      return;
    }
    if (!projectThumbnailSceneChanged(lastProjectSnapshotRef.current, sceneKey)) {
      return;
    }
    if (projectInteractionActive) {
      return;
    }

    let stopped = false;
    let uploadController: AbortController | null = null;
    const capture = async () => {
      if (stopped || projectSnapshotRunRef.current !== runId) {
        return true;
      }
      const image = window.layerlingCaptureCanvasAsync
        ? await window.layerlingCaptureCanvasAsync()
        : window.layerlingCaptureCanvas?.() ?? "";
      if (stopped || projectSnapshotRunRef.current !== runId) {
        return true;
      }
      if (image && image.length > 100) {
        const controller = new AbortController();
        uploadController = controller;
        try {
          await onProjectSnapshot({ image, projectId, shapes: shapes.length }, controller.signal);
          if (!stopped && projectSnapshotRunRef.current === runId && !controller.signal.aborted) {
            lastProjectSnapshotRef.current = sceneKey;
          }
          return true;
        } catch (error) {
          if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) {
            return true;
          }
          return false;
        } finally {
          if (uploadController === controller) uploadController = null;
        }
      }
      return false;
    };

    let idleId: number | null = null;
    let retryTimer: number | null = null;
    const runCapture = () => {
      void capture().then((captured) => {
        if (!captured) {
          retryTimer = window.setTimeout(() => void capture(), 650);
        }
      });
    };
    const captureTimer = window.setTimeout(() => {
      if ("requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(runCapture, { timeout: 1200 });
      } else {
        runCapture();
      }
    }, PROJECT_THUMBNAIL_IDLE_MS);
    return () => {
      stopped = true;
      uploadController?.abort();
      window.clearTimeout(captureTimer);
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      if (idleId !== null && "cancelIdleCallback" in window) window.cancelIdleCallback(idleId);
    };
  }, [onProjectSnapshot, projectId, projectInteractionActive, shapes]);

  useEffect(() => {
    if (selectedShapes.length < 2) {
      setAlignMode(false);
      setAlignAnchorId(null);
      setAlignPreview(null);
    }
    if (alignAnchorId && !selectedIds.includes(alignAnchorId)) {
      setAlignAnchorId(null);
      setAlignPreview(null);
    }
    if (selectedShapes.length === 0) {
      setMirrorMode(false);
      setMirrorPreviewAxis(null);
      setPivotPickMode(false);
    }
  }, [alignAnchorId, selectedIds, selectedShapes.length]);

  const selectionKey = selectedIds.join("|");
  // One body selected: the pivot it carries. Several: the one set for them.
  const ownPivotShape = selectedShapes.length === 1 ? selectedShapes[0] : null;
  const ownRotationPivot = useMemo(() => (ownPivotShape ? shapePivotWorld(ownPivotShape) : null), [ownPivotShape]);
  const activeRotationPivot = ownPivotShape
    ? ownRotationPivot
    : rotationPivot?.selectionKey === selectionKey ? rotationPivot.point : null;
  useEffect(() => {
    if (rotationPivot && rotationPivot.selectionKey !== selectionKey) setRotationPivot(null);
  }, [rotationPivot, selectionKey]);

  const toggleRotationPivot = useCallback(() => {
    if (pivotPickMode) {
      setPivotPickMode(false);
      setNotice(t("status.pivotPickCancelled"));
      return;
    }
    if (activeRotationPivot) {
      if (ownPivotShape) writeOwnPivotRef.current(ownPivotShape.id, undefined);
      else setRotationPivot(null);
      setNotice(t("status.pivotCleared"));
      return;
    }
    if (!hasSelection) {
      setNotice(t("status.selectShapeFirst"));
      return;
    }
    closeSplit();
    stopCruise();
    setPivotPickMode(true);
    setNotice(t("status.pivotPickStart"));
  }, [activeRotationPivot, closeSplit, hasSelection, ownPivotShape, pivotPickMode, stopCruise]);

  // A pattern belongs to the selection it was opened for, and so does scaling by percent.
  useEffect(() => {
    setArrayTool(null);
    setScalePercentTool(null);
    setScalePercentError(null);
  }, [selectionKey]);

  const toggleArrayTool = useCallback(() => {
    if (arrayTool) {
      setArrayTool(null);
      setNotice(t("status.arrayCancelled"));
      return;
    }
    if (selectedShapes.length === 0) {
      setNotice(t("status.selectShapeFirst"));
      return;
    }
    const bounds = boundsForShapes(selectedShapes);
    setAlignMode(false);
    setMirrorMode(false);
    setPivotPickMode(false);
    closeSplit();
    setArrayTool({
      mode: "row",
      count: 4,
      // Next to each other with a little air, whatever the size of the part.
      ...singleAxisSpacing("x", Math.round((bounds.maxX - bounds.minX + 5) * 2) / 2),
      angle: 360,
      centerX: activeRotationPivot ? activeRotationPivot.x : 0,
      centerY: activeRotationPivot ? -activeRotationPivot.z : 0,
      rotateCopies: true,
      rise: 0,
      radiusChange: 0,
    });
    setNotice(t("status.arrayStart"));
  }, [activeRotationPivot, arrayTool, closeSplit, selectedShapes]);


  const pickRotationPivot = useCallback((point: PivotPoint | null) => {
    setPivotPickMode(false);
    if (!point) {
      setNotice(t("status.pivotMissed"));
      return;
    }
    // A single body keeps its pivot; several bodies share one for this selection.
    if (ownPivotShape) writeOwnPivotRef.current(ownPivotShape.id, shapePivotFromWorld(ownPivotShape, point));
    else setRotationPivot({ selectionKey, point });
    setNotice(t("status.pivotSet"));
  }, [ownPivotShape, selectionKey]);

  /** Hands the shapes to the page above, which writes them to the browser's storage. */
  const emitProjectShapes = useCallback(
    (canonicalNext: WorkplaneShape[], serialized: string) => {
      if (!projectId || !onProjectShapesChange) {
        return;
      }
      lastProjectShapesSyncRef.current = serialized;
      lastProjectShapesEchoRef.current = serialized;
      onProjectShapesChange({
        projectId,
        shapes: canonicalNext,
        history: historyRef.current,
        historyIndex: historyIndexRef.current,
        assets: projectAssetsRef.current,
        projectName: projectInfoRef.current.projectName,
        projectCreatedAt: projectInfoRef.current.projectCreatedAt,
        workspace: workspaceSettingsRef.current,
        snapGrid: snapGridRef.current,
        placementElevation: placementElevationRef.current,
        placementWorkplane: placementWorkplaneRef.current,
        sketchPlacementWorkplane: placementWorkplaneRef.current,
      });
    },
    [onProjectShapesChange, projectId],
  );

  /**
   * Saves what waited for an interaction to end, right now. A held interaction
   * may only delay saving, never stop it: when its end never arrives (a field
   * that vanished while focused, a pointer released outside the window), the
   * changes after it would otherwise live in memory only (discussion #87).
   */
  const flushHeldProjectShapes = useCallback(() => {
    if (heldProjectSyncTimerRef.current !== null) {
      window.clearTimeout(heldProjectSyncTimerRef.current);
      heldProjectSyncTimerRef.current = null;
    }
    const pending = pendingProjectShapesRef.current;
    if (!pending) return;
    pendingProjectShapesRef.current = null;
    const serialized = projectShapesFingerprint(pending);
    if (lastProjectShapesSyncRef.current === serialized) return;
    emitProjectShapes(pending, serialized);
  }, [emitProjectShapes]);

  useEffect(() => {
    if (!splitSession) return;
    const sameTargets = splitSession.targetIds.length === selectedIds.length
      && splitSession.targetIds.every((id) => selectedIds.includes(id))
      && splitTargetShapes.length === splitSession.targetIds.length;
    const sceneUnchanged = projectShapesFingerprint(shapes) === splitSession.sourceFingerprint;
    if (sameTargets && sceneUnchanged) return;
    splitRunRef.current += 1;
    setSplitSession(null);
    setNotice(t("status.splitCancelledChanged"));
  }, [selectedIds, shapes, splitSession, splitTargetShapes.length]);

  const syncProjectShapes = useCallback(
    (nextShapes: WorkplaneShape[], force = false) => {
      if (!projectId || !onProjectShapesChange) {
        return;
      }
      if (projectInteractionActiveRef.current) {
        pendingProjectShapesRef.current = nextShapes.map(canonicalizeShape);
        if (projectSyncTimerRef.current !== null) {
          window.clearTimeout(projectSyncTimerRef.current);
          projectSyncTimerRef.current = null;
        }
        if (heldProjectSyncTimerRef.current !== null) {
          window.clearTimeout(heldProjectSyncTimerRef.current);
        }
        heldProjectSyncTimerRef.current = window.setTimeout(flushHeldProjectShapes, PROJECT_SYNC_HELD_MAX_MS);
        return;
      }
      const canonicalNext = nextShapes.map(canonicalizeShape);
      const serialized = projectShapesFingerprint(canonicalNext);
      if (!force && lastProjectShapesSyncRef.current === serialized) {
        return;
      }
      if (projectSyncTimerRef.current !== null) {
        window.clearTimeout(projectSyncTimerRef.current);
      }
      projectSyncTimerRef.current = window.setTimeout(() => {
        projectSyncTimerRef.current = null;
        emitProjectShapes(canonicalNext, serialized);
      }, 120);
    },
    [emitProjectShapes, flushHeldProjectShapes, onProjectShapesChange, projectId],
  );

  /*
   * Leaving the window - closing it, switching to another app, the Mac going
   * to sleep - is the last moment a waiting save can still start. A hidden
   * window may be frozen or closed without another chance.
   */
  const saveProjectShapesNow = useCallback(() => {
    if (projectSyncTimerRef.current !== null) {
      window.clearTimeout(projectSyncTimerRef.current);
      projectSyncTimerRef.current = null;
      const canonicalNext = shapesRef.current.map(canonicalizeShape);
      emitProjectShapes(canonicalNext, projectShapesFingerprint(canonicalNext));
    }
    flushHeldProjectShapes();
  }, [emitProjectShapes, flushHeldProjectShapes]);

  useEffect(() => {
    if (!projectId || !onProjectShapesChange) return;
    const saveNow = () => {
      if (document.visibilityState !== "hidden") return;
      saveProjectShapesNow();
    };
    document.addEventListener("visibilitychange", saveNow);
    window.addEventListener("pagehide", saveNow);
    return () => {
      document.removeEventListener("visibilitychange", saveNow);
      window.removeEventListener("pagehide", saveNow);
    };
  }, [onProjectShapesChange, projectId, saveProjectShapesNow]);

  useEffect(() => {
    const limitChanged = historyLimitRef.current !== workspaceSettings.historyLimit;
    historyLimitRef.current = workspaceSettings.historyLimit;
    const bounded = boundedEditorHistoryState(
      historyRef.current,
      historyIndexRef.current,
      workspaceSettings.historyLimit,
    );
    if (bounded.entries !== historyRef.current || bounded.index !== historyIndexRef.current) {
      historyRef.current = bounded.entries;
      historyIndexRef.current = bounded.index;
      setHistory(bounded.entries);
      setHistoryIndex(bounded.index);
    }
    if (limitChanged) syncProjectShapes(shapesRef.current, true);
  }, [syncProjectShapes, workspaceSettings.historyLimit]);

  const appendHistoryEntry = useCallback((entry: EditorHistoryEntry) => {
    openGroupHistoryRef.current.set(entry.fingerprint, openGroupsRef.current);
    const result = appendEditorHistorySnapshot(
      historyRef.current,
      historyIndexRef.current,
      entry,
      workspaceSettingsRef.current.historyLimit,
    );
    if (result.entries !== historyRef.current) {
      historyRef.current = result.entries;
      setHistory(result.entries);
    }
    historyIndexRef.current = result.index;
    setHistoryIndex(result.index);
    return result.changed;
  }, []);

  const appendHistorySnapshot = useCallback(
    (
      nextShapes: WorkplaneShape[],
      nextSelection: string[],
      nextNotes: WorkplaneNote[] = notesRef.current,
      nextWorkplane: PlacementWorkplane = placementWorkplaneRef.current,
    ) =>
      appendHistoryEntry(editorHistoryEntry(nextShapes, nextSelection, nextNotes, nextWorkplane)),
    [appendHistoryEntry],
  );

  const finalizeInteractionHistory = useCallback(() => {
    const startFingerprint = interactionHistoryStartRef.current;
    const hadChanges = interactionHistoryChangedRef.current;
    interactionHistoryStartRef.current = "";
    interactionHistoryChangedRef.current = false;
    if (!hadChanges) {
      return;
    }

    const entry = editorHistoryEntry(shapesRef.current, selectedIdsRef.current, notesRef.current, placementWorkplaneRef.current);
    if (!startFingerprint || startFingerprint === entry.fingerprint) {
      return;
    }

    appendHistoryEntry(entry);
  }, [appendHistoryEntry]);

  useEffect(() => {
    if (projectInteractionActive || !pendingProjectShapesRef.current) {
      return;
    }
    if (heldProjectSyncTimerRef.current !== null) {
      window.clearTimeout(heldProjectSyncTimerRef.current);
      heldProjectSyncTimerRef.current = null;
    }
    pendingProjectShapesRef.current = null;
    const timer = window.setTimeout(() => syncProjectShapes(shapesRef.current), 180);
    return () => window.clearTimeout(timer);
  }, [projectInteractionActive, syncProjectShapes]);

  const updateProjectInteractionActive = useCallback(
    (active: boolean) => {
      if (active) {
        if (interactionHistoryTimerRef.current !== null) {
          window.clearTimeout(interactionHistoryTimerRef.current);
          interactionHistoryTimerRef.current = null;
          finalizeInteractionHistory();
        }
        if (!projectInteractionActiveRef.current) {
          interactionHistoryStartRef.current = projectSceneFingerprint(shapesRef.current, notesRef.current, placementWorkplaneRef.current);
          interactionHistoryChangedRef.current = false;
        }
        projectInteractionActiveRef.current = true;
        setProjectInteractionActive((current) => (current ? current : true));
        return;
      }

      projectInteractionActiveRef.current = false;
      setProjectInteractionActive((current) => (current ? false : current));
      if (interactionHistoryTimerRef.current !== null) {
        window.clearTimeout(interactionHistoryTimerRef.current);
      }
      interactionHistoryTimerRef.current = window.setTimeout(() => {
        interactionHistoryTimerRef.current = null;
        finalizeInteractionHistory();
      }, 0);
    },
    [finalizeInteractionHistory],
  );

  const updateProjectWorkspaceSettings = useCallback(
    (settings: { workspace: WorkplaneWorkspaceSettings; snap: GridSize }) => {
      const nextWorkspace = normalizeWorkspaceSettings(settings.workspace);
      workspaceSettingsRef.current = nextWorkspace;
      if (!nextWorkspace.clickToPlaceShapes && cruiseAssetRef.current) {
        setCruiseAsset(null);
        setNotice("");
      }
      snapGridRef.current = settings.snap;
      setWorkspaceSettings((current) => (
        workplaneSettingsFingerprint(current, settings.snap) === workplaneSettingsFingerprint(nextWorkspace, settings.snap)
          ? current
          : nextWorkspace
      ));
      setSnapGrid(settings.snap);
      if (!projectId || !onProjectWorkspaceChange) {
        return;
      }
      onProjectWorkspaceChange({
        projectId,
        workspace: nextWorkspace,
        snap: settings.snap,
        placementElevation,
        placementWorkplane: placementWorkplaneRef.current,
        sketchPlacementWorkplane: placementWorkplaneRef.current,
      });
    },
    [onProjectWorkspaceChange, placementElevation, projectId],
  );

  useEffect(() => {
    if (!projectId || !onProjectWorkspaceChange) return;
    onProjectWorkspaceChange({
      projectId,
      workspace: workspaceSettingsRef.current,
      snap: snapGrid,
      placementElevation,
      placementWorkplane,
      sketchPlacementWorkplane: placementWorkplane,
    });
  }, [onProjectWorkspaceChange, placementElevation, placementWorkplane, projectId, snapGrid]);

  const commitShapes = useCallback(
    (next: WorkplaneShape[], nextSelection: string | string[] | null = selectedIds, message?: string) => {
      // Solange der Verlaufsblick offen ist, zeigt die Flaeche nicht den
      // Entwurf. Eine Aenderung, die jetzt noch durchkaeme - ueber einen
      // Umweg, den die Leiste nicht kennt -, traefe etwas, das keiner sieht.
      if (historyViewStateRef.current) {
        setNotice(t("status.historyViewBlocksEdits"));
        return;
      }
      const canonicalNext = next.map(canonicalizeShape);
      const requestedSelection = Array.isArray(nextSelection) ? nextSelection : nextSelection ? [nextSelection] : [];
      const validSelection = requestedSelection.filter((id, index) => requestedSelection.indexOf(id) === index && canonicalNext.some((shape) => shape.id === id));
      // Eine Notiz, deren Koerper nicht mehr da ist, bleibt stehen und loest
      // sich nur von ihm - sonst waere jedes Gruppieren ein stiller Verlust.
      const nextNotes = detachNotesFromMissingShapes(notesRef.current, canonicalNext);
      const levels = openGroupsRef.current;
      if (levels.length && !openGroupTransitionRef.current) {
        const levelPartIds = levels.map((level) => level.childIds);
        const tracked = trackOpenGroupLevels(levelPartIds, shapesRef.current, canonicalNext);
        if (tracked !== levelPartIds) {
          setOpenGroupLevels(levels.map((level, index) => (tracked[index] === level.childIds ? level : { ...level, childIds: [...tracked[index]] })));
        }
      }
      shapesRef.current = canonicalNext;
      selectedIdsRef.current = validSelection;
      notesRef.current = nextNotes;
      setShapes(canonicalNext);
      setSelectedIds(validSelection);
      if (nextNotes !== notes) setNotes(nextNotes);
      const changed = appendHistorySnapshot(canonicalNext, validSelection, nextNotes);
      if (message) {
        // Eine Bestaetigung: Etwas ist entstanden, hat sich geaendert oder ist
        // verschwunden - und das sieht man ohnehin. Sie geht nach Sekunden.
        setNotice(message);
      }
      if (changed) {
        syncProjectShapes(canonicalNext);
      }
    },
    [appendHistorySnapshot, notes, selectedIds, setOpenGroupLevels, syncProjectShapes],
  );

  /**
   * Notizen aendern sich wie Koerper: ueber den Verlauf. Deshalb liegt hier
   * alles, was sie anfasst - anlegen, tippen, verschieben, loeschen -, und jeder
   * dieser Wege legt einen Stand ab, den Rueckgaengig wieder holen kann.
   */
  const commitNotes = useCallback(
    (next: WorkplaneNote[], message?: string) => {
      if (historyViewStateRef.current) {
        setNotice(t("status.historyViewBlocksEdits"));
        return;
      }
      const normalized = normalizeNotes(next);
      notesRef.current = normalized;
      setNotes(normalized);
      const changed = appendHistoryEntry(editorHistoryEntry(shapesRef.current, selectedIdsRef.current, normalized, placementWorkplaneRef.current));
      if (message) setNotice(message);
      // Der Abgleich mit dem Projektspeicher vergleicht Koerper. Eine Notiz
      // aendert daran nichts, also muss er hier ausdruecklich laufen.
      if (changed) syncProjectShapes(shapesRef.current, true);
    },
    [appendHistoryEntry, setNotice, syncProjectShapes],
  );

  const addNote = useCallback(
    (note: { x: number; y: number; z: number; anchor?: WorkplaneNote["anchor"] }) => {
      if (notesRef.current.length >= NOTE_COUNT_LIMIT) {
        setNotice(t("status.noteLimitReached", { count: NOTE_COUNT_LIMIT }));
        return null;
      }
      const created: WorkplaneNote = { id: createNoteId(), text: "", x: note.x, y: note.y, z: note.z };
      if (note.anchor) created.anchor = note.anchor;
      commitNotes([...notesRef.current, created], note.anchor ? t("status.notePinned") : t("status.noteAdded"));
      return created.id;
    },
    [commitNotes, setNotice],
  );

  /**
   * Reference points: bare marks in space that shapes snap to. They live among
   * the notes (so they are saved, undone and shared like them) but are not notes.
   */
  const addReferencePoints = useCallback(
    (positions: ReferencePosition[]) => {
      const fresh = newReferencePositions(notesRef.current, positions);
      if (fresh.length === 0) {
        setNotice(t("status.pointsExist"));
        return [] as string[];
      }
      const room = NOTE_COUNT_LIMIT - notesRef.current.length;
      if (room <= 0) {
        setNotice(t("status.noteLimitReached", { count: NOTE_COUNT_LIMIT }));
        return [] as string[];
      }
      const created: WorkplaneNote[] = fresh.slice(0, room).map((position) => ({
        id: createNoteId(),
        text: "",
        ...position,
        kind: "point",
        collapsed: true,
      }));
      setNotesVisible(true);
      commitNotes([...notesRef.current, ...created], t("status.pointsAdded", { count: created.length }));
      return created.map((point) => point.id);
    },
    [commitNotes, setNotice],
  );

  const markSelectionPoints = useCallback(
    (spot: ReferencePointSpot) => {
      const box = unionReferenceBoxes(selectedShapes.filter((shape) => !shape.hole).map(meshAabb));
      if (box) addReferencePoints(referencePointsForBox(box, spot));
    },
    [addReferencePoints, selectedShapes],
  );

  /**
   * Beim Tippen und beim Ziehen faellt pro Anschlag eine Aenderung an. Jede
   * davon in den Verlauf zu legen, machte Rueckgaengig unbrauchbar - also geht
   * ein solcher Zwischenstand nur in den Zustand, und der Verlauf bekommt ihn,
   * wenn die Hand stillhaelt oder das Feld den Fokus abgibt.
   */
  const updateNote = useCallback(
    (id: string, patch: Partial<WorkplaneNote>, transient = false) => {
      const current = notesRef.current;
      if (!current.some((note) => note.id === id)) return;
      const next = current.map((note) => {
        if (note.id !== id) return note;
        const merged: WorkplaneNote = { ...note, ...patch, id: note.id };
        if (typeof patch.text === "string") merged.text = patch.text.slice(0, NOTE_TEXT_LIMIT);
        // `anchor: undefined` heisst „loese dich" und muss das Feld wirklich los
        // werden, sonst traegt die Notiz es nach dem Sichern wieder.
        if ("anchor" in patch && !patch.anchor) delete merged.anchor;
        return merged;
      });
      if (noteCommitTimerRef.current !== null) {
        window.clearTimeout(noteCommitTimerRef.current);
        noteCommitTimerRef.current = null;
      }
      if (!transient) {
        commitNotes(next);
        return;
      }
      notesRef.current = next;
      setNotes(next);
      noteCommitTimerRef.current = window.setTimeout(() => {
        noteCommitTimerRef.current = null;
        commitNotes(notesRef.current);
      }, NOTE_COMMIT_IDLE_MS);
    },
    [commitNotes],
  );

  const removeNote = useCallback(
    (id: string) => {
      if (noteCommitTimerRef.current !== null) {
        window.clearTimeout(noteCommitTimerRef.current);
        noteCommitTimerRef.current = null;
      }
      const current = notesRef.current;
      const removed = current.find((note) => note.id === id);
      if (!removed) return;
      commitNotes(current.filter((note) => note.id !== id), t(removed.kind === "point" ? "status.pointRemoved" : "status.noteRemoved"));
    },
    [commitNotes],
  );

  /**
   * Das Notizwerkzeug: Der naechste Klick auf die Arbeitsflaeche setzt eine
   * Notiz. Es schliesst aus, was sonst am Zeiger haengt - zwei Werkzeuge auf
   * einem Klick waeren ein Ratespiel.
   */
  const toggleNoteTool = useCallback(() => {
    stopCruise();
    setNoteMode((current) => {
      const next = !current;
      if (next) {
        setWorkplaneMode(false);
        setNotesVisible(true);
        setNotice(t("status.noteMode"), true);
      } else {
        setNotice("");
      }
      return next;
    });
  }, [setNotice, stopCruise]);

  const toggleOverhangsVisible = useCallback(() => {
    setOverhangsVisible((current) => {
      const next = !current;
      setNotice(next ? t("status.overhangsShown", { angle: workspaceSettingsRef.current.overhangAngle }) : t("status.overhangsHidden"));
      return next;
    });
  }, []);

  const toggleNotesVisible = useCallback(() => {
    setNotesVisible((current) => {
      const next = !current;
      if (!next) setNoteMode(false);
      setNotice(next ? t("status.notesShown") : t("status.notesHidden"));
      return next;
    });
  }, [setNotice]);

  const removeEdgeTreatment = useCallback(async (optionId: string) => {
    if (!selectedShape) {
      setNotice(t("status.selectShapeWithEdge"));
      return;
    }
    if (selectedShape.locked) {
      setNotice(t("status.unlockBeforeEdgeRemove"));
      return;
    }
    const option = selectedEdgeHistoryOptions.find((candidate) => candidate.id === optionId);
    if (!option) {
      setNotice(t("status.chooseEdgeFeature"), true);
      return;
    }
    const sourceFingerprint = projectShapesFingerprint([selectedShape]);
    const sourceProjectId = projectInfoRef.current.projectId;
    const restored = await restoreEdgeTreatmentInShape(selectedShape, option.path, option.entryId, workspaceSettingsRef.current.booleanTriangleLimit);
    if (!restored) {
      setNotice(selectedEdgeFeatureCount > 0 ? t("status.edgeNoUndoHistory") : t("status.noEdgeFeature"));
      return;
    }
    const currentTarget = shapesRef.current.find((shape) => shape.id === selectedShape.id);
    if (projectInfoRef.current.projectId !== sourceProjectId || !currentTarget || projectShapesFingerprint([currentTarget]) !== sourceFingerprint) {
      setNotice(t("status.edgeRemoveChanged"));
      return;
    }
    invalidateCadModifierSession();
    commitShapes(
      shapesRef.current.map((shape) => shape.id === selectedShape.id ? restored.shape : shape),
      restored.shape.id,
    );
    setNotice(t("status.removedFeature", { label: restored.label }));
  }, [commitShapes, invalidateCadModifierSession, selectedEdgeFeatureCount, selectedEdgeHistoryOptions, selectedShape]);

  const commitSketchProfile = useCallback(
    (next: SketchProfile, message?: string) => {
      const current = sketchHistoryRef.current;
      const currentIndex = Math.min(sketchHistoryIndexRef.current, Math.max(0, current.length - 1));
      const trimmed = current.slice(0, currentIndex + 1);
      const latest = trimmed.at(-1);
      // Most edits build a new profile from points and lines only; the stroke (#154) carries over
      // unless the edit sets it - or clears it with `stroke: undefined`.
      const carried = "stroke" in next || !latest?.stroke ? next : { ...next, stroke: latest.stroke };
      const snapshot = cloneSketchProfile(addLineIntersectionPoints(carried, createLocalId));
      setSketchProfile(snapshot);
      if (latest && JSON.stringify(latest) === JSON.stringify(snapshot)) {
        return;
      }
      const nextHistory = [...trimmed, cloneSketchProfile(snapshot)].slice(-MAX_SKETCH_HISTORY_ENTRIES);
      sketchHistoryRef.current = nextHistory;
      sketchHistoryIndexRef.current = nextHistory.length - 1;
      setSketchHistory(nextHistory);
      setSketchHistoryIndex(sketchHistoryIndexRef.current);
      if (message) setNotice(message);
    },
    [],
  );

  const beginSketch = useCallback((
    operation: SketchOperation,
    profile?: SketchProfile,
    editingId: string | null = null,
    revolveSettings?: Partial<SketchRevolveSettings>,
    workplaneOverride?: PlacementWorkplane,
  ) => {
    const initial = cloneSketchProfile(profile ?? emptySketchProfile());
    setCruiseAsset(null);
    setWorkplaneMode(false);
    setActiveSketchWorkplane(normalizePlacementWorkplane(workplaneOverride ?? placementWorkplaneRef.current));
    setToolbarMode("sketch");
    setSketchActive(true);
    setSketchOperation(operation);
    setSketchRevolveSettings(normalizeSketchRevolveSettings(revolveSettings));
    setSketchRevolvePreview(null);
    setSketchTool(profile?.segments.length ? "select" : "line");
    setSketchProfile(initial);
    const initialHistory = [cloneSketchProfile(initial)];
    sketchHistoryRef.current = initialHistory;
    sketchHistoryIndexRef.current = 0;
    setSketchHistory(initialHistory);
    setSketchHistoryIndex(0);
    setSketchActivePointId(null);
    setSketchSelection(null);
    setSketchMeasureStart(null);
    setSketchMeasurement(null);
    setEditingSketchShapeId(editingId);
    setNotice(editingId
      ? t(operation === "revolve" ? "status.editingRevolveProfile" : "status.editingProfile")
      : operation === "revolve" ? t("status.revolveStarted") : t("status.sketchStarted"));
  }, []);

  const beginSketchEdit = useCallback(() => {
    if (selectedShapes.length !== 1 || !selectedShape?.sketchProfile) {
      setNotice(t("status.selectSketchShape"));
      return;
    }
    const operation = selectedShape.sketchOperation ?? (selectedShape.sketchRevolve ? "revolve" : "extrude");
    let editWorkplane: PlacementWorkplane | undefined;
    if (operation === "extrude") {
      const quaternion = quaternionForShape(selectedShape);
      const normal = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion).normalize();
      const xAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion).normalize();
      const zAxis = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion).normalize();
      const points = selectedShape.sketchProfile.points;
      const profileCenterX = points.length
        ? (Math.min(...points.map((point) => point.x)) + Math.max(...points.map((point) => point.x))) / 2
        : 0;
      const profileCenterZ = points.length
        ? (Math.min(...points.map((point) => point.z)) + Math.max(...points.map((point) => point.z))) / 2
        : 0;
      const origin = new THREE.Vector3(
        selectedShape.x,
        (selectedShape.elevation ?? 0) + selectedShape.height / 2,
        selectedShape.z,
      )
        .addScaledVector(normal, -selectedShape.height / 2)
        .addScaledVector(xAxis, -profileCenterX)
        .addScaledVector(zAxis, -profileCenterZ);
      editWorkplane = placementWorkplaneFromSurface(
        { x: origin.x, y: origin.y, z: origin.z },
        { x: normal.x, y: normal.y, z: normal.z },
        { x: xAxis.x, y: xAxis.y, z: xAxis.z },
      );
    } else if (operation === "revolve") {
      const quaternion = quaternionForShape(selectedShape);
      const normal = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion).normalize();
      const xAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion).normalize();
      const origin = new THREE.Vector3(
        selectedShape.x,
        (selectedShape.elevation ?? 0) + selectedShape.height / 2,
        selectedShape.z,
      ).addScaledVector(normal, -selectedShape.height / 2);
      editWorkplane = placementWorkplaneFromSurface(
        { x: origin.x, y: origin.y, z: origin.z },
        { x: normal.x, y: normal.y, z: normal.z },
        { x: xAxis.x, y: xAxis.y, z: xAxis.z },
      );
    }
    beginSketch(operation, selectedShape.sketchProfile, selectedShape.id, selectedShape.sketchRevolve, editWorkplane);
  }, [beginSketch, selectedShape, selectedShapes.length]);

  const cancelSketch = useCallback(() => {
    setSketchActive(false);
    setSketchActivePointId(null);
    setSketchSelection(null);
    setSketchMeasureStart(null);
    setSketchMeasurement(null);
    setEditingSketchShapeId(null);
    setSketchRevolvePreview(null);
    setSketchStrokePanelOpen(false);
    // Back to the 3D editor tab, as finishing does; otherwise the toolbar stays on an empty sketch tab (#212).
    setToolbarMode("geometry");
    setNotice(t("status.sketchCancelled"));
  }, []);

  const sketchUndo = useCallback(() => {
    const currentHistory = sketchHistoryRef.current;
    const currentIndex = sketchHistoryIndexRef.current;
    if (currentIndex <= 0) {
      setNotice(t("status.nothingToUndoSketch"));
      return;
    }
    const nextIndex = currentIndex - 1;
    sketchHistoryIndexRef.current = nextIndex;
    setSketchHistoryIndex(nextIndex);
    setSketchProfile(cloneSketchProfile(currentHistory[nextIndex] ?? emptySketchProfile()));
    setSketchActivePointId(null);
    setSketchSelection(null);
    setNotice(t("status.sketchUndo"));
  }, []);

  const sketchRedo = useCallback(() => {
    const currentHistory = sketchHistoryRef.current;
    const currentIndex = sketchHistoryIndexRef.current;
    if (currentIndex >= currentHistory.length - 1) {
      setNotice(t("status.nothingToRedoSketch"));
      return;
    }
    const nextIndex = currentIndex + 1;
    sketchHistoryIndexRef.current = nextIndex;
    setSketchHistoryIndex(nextIndex);
    setSketchProfile(cloneSketchProfile(currentHistory[nextIndex] ?? emptySketchProfile()));
    setSketchActivePointId(null);
    setSketchSelection(null);
    setNotice(t("status.sketchRedo"));
  }, []);

  const setActiveSketchTool = useCallback((tool: SketchTool) => {
    setSketchTool(tool);
    setSketchActivePointId(null);
    setSketchSelection(null);
    if (tool !== "measure") setSketchMeasureStart(null);
    const messages: Record<SketchTool, string> = {
      line: t("status.sketchTool.line"),
      bezier: t("status.sketchTool.bezier"),
      smooth: t("status.sketchTool.smooth"),
      rectangle: t("status.sketchTool.rectangle"),
      circle: t("status.sketchTool.circle"),
      ellipse: t("status.sketchTool.ellipse"),
      halfCircle: t("status.sketchTool.halfCircle"),
      pieSlice: t("status.sketchTool.pieSlice"),
      boltCircle: t("status.sketchTool.boltCircle"),
      triangle: t("status.sketchTool.triangle"),
      hexagon: t("status.sketchTool.hexagon"),
      select: t("status.sketchTool.select"),
      refine: t("status.sketchTool.refine"),
      erase: t("status.sketchTool.erase"),
      measure: t("status.sketchTool.measure"),
    };
    setNotice(messages[tool]);
  }, []);

  const measureSketchPoint = useCallback(
    (point: SketchPoint) => {
      if (!sketchMeasureStart) {
        setSketchMeasureStart({ ...point });
        setSketchMeasurement(null);
        setNotice(t("status.chooseSecondPoint"), true);
        return;
      }
      const measurement = { start: { ...sketchMeasureStart }, end: { ...point } };
      setSketchMeasurement(measurement);
      setSketchMeasureStart(null);
      setNotice(t("status.measured", {
        value: Number(Math.hypot(measurement.end.x - measurement.start.x, measurement.end.z - measurement.start.z).toFixed(2)),
      }));
    },
    [sketchMeasureStart],
  );

  const clearSketchMeasurement = useCallback(() => {
    setSketchMeasureStart(null);
    setSketchMeasurement(null);
    setNotice(t("status.sketchMeasurementRemoved"));
  }, []);

  const connectSketchPoint = useCallback(
    (pointId: string, profile = sketchProfile) => {
      if (!["line", "bezier", "smooth"].includes(sketchTool)) return profile;
      const curveKind = sketchTool as NonNullable<SketchSegment["kind"]>;
      if (!sketchActivePointId) {
        setSketchActivePointId(pointId);
        setSketchSelection({ kind: "point", id: pointId });
        return profile;
      }
      if (sketchActivePointId === pointId) return profile;
      const duplicate = profile.segments.some(
        (segment) =>
          (segment.startId === sketchActivePointId && segment.endId === pointId) ||
          (segment.startId === pointId && segment.endId === sketchActivePointId),
      );
      const next = duplicate
        ? profile
        : {
            ...profile,
            segments: [...profile.segments, { id: createLocalId("sketch-segment"), startId: sketchActivePointId, endId: pointId, kind: curveKind }],
          };
      const smoothed = sketchTool === "smooth" ? withSmoothSketchHandles(next) : next;
      const closed = orderedSketchPaths(smoothed).some((path) => path.closed && path.steps.some((step) => step.segment.startId === sketchActivePointId || step.segment.endId === sketchActivePointId));
      if (!duplicate) commitSketchProfile(smoothed, closed ? t("status.sketchProfileClosed") : t("status.sketchSegmentAdded"));
      setSketchActivePointId(closed ? null : pointId);
      setSketchSelection({ kind: "point", id: pointId });
      if (closed) setSketchTool("select");
      return smoothed;
    },
    [commitSketchProfile, sketchActivePointId, sketchProfile, sketchTool],
  );

  const addSketchPlanePoint = useCallback(
    (position: { x: number; z: number }, handles?: { handleIn: { x: number; z: number }; handleOut: { x: number; z: number } }) => {
      if (sketchTool === "measure") {
        measureSketchPoint({ id: "measure", ...position });
        return;
      }
      if (!["line", "bezier", "smooth"].includes(sketchTool)) return;
      const curveKind = sketchTool as NonNullable<SketchSegment["kind"]>;
      const existing = sketchProfile.points.find((point) => Math.hypot(point.x - position.x, point.z - position.z) < 0.0001);
      if (existing) {
        connectSketchPoint(existing.id);
        return;
      }
      const point: SketchPoint = {
        id: createLocalId("sketch-point"),
        ...position,
        ...(handles ?? {}),
        mode: sketchTool === "line" ? "corner" : sketchTool === "smooth" ? "smooth" : handles ? "smooth" : "corner",
      };
      const next: SketchProfile = { ...sketchProfile, points: [...sketchProfile.points, point] };
      if (sketchActivePointId) {
        next.segments = [...next.segments, { id: createLocalId("sketch-segment"), startId: sketchActivePointId, endId: point.id, kind: curveKind }];
      }
      const prepared = sketchTool === "smooth" ? withSmoothSketchHandles(next) : next;
      commitSketchProfile(prepared, sketchActivePointId ? t("status.sketchPointSegmentAdded") : t("status.sketchPointAdded"));
      setSketchActivePointId(point.id);
      setSketchSelection({ kind: "point", id: point.id });
    },
    [commitSketchProfile, connectSketchPoint, measureSketchPoint, sketchActivePointId, sketchProfile, sketchTool],
  );

  const addSketchPrimitive = useCallback(
    (primitive: SketchPrimitive, center: { x: number; z: number } = { x: 0, z: 0 }) => {
      const { points, segments } = sketchPrimitiveGeometry(primitive, center, createLocalId);

      const next: SketchProfile = {
        ...sketchProfile,
        points: [...sketchProfile.points, ...points],
        segments: [...sketchProfile.segments, ...segments],
      };
      commitSketchProfile(next, t("status.sketchPrimitiveAdded", { shape: t(`sketch.${primitive}`) }));
      setSketchActivePointId(null);
      setSketchSelection(null);
      setSketchTool("select");
    },
    [commitSketchProfile, sketchProfile],
  );

  const pressSketchPoint = useCallback(
    (id: string) => {
      const point = sketchProfile.points.find((entry) => entry.id === id);
      if (!point) return;
      if (sketchTool === "measure") {
        measureSketchPoint(point);
        setSketchSelection({ kind: "point", id });
        return;
      }
      if (sketchTool === "select") {
        setSketchSelection({ kind: "point", id });
        setSketchActivePointId(null);
        return;
      }
      connectSketchPoint(id);
    },
    [connectSketchPoint, measureSketchPoint, sketchProfile.points, sketchTool],
  );

  const deleteSketchPoint = useCallback(
    (id: string) => {
      const connected = sketchProfile.segments.filter((segment) => segment.startId === id || segment.endId === id);
      const neighboringIds = connected.map((segment) => segment.startId === id ? segment.endId : segment.startId);
      const remainingSegments = sketchProfile.segments.filter((segment) => segment.startId !== id && segment.endId !== id);
      if (neighboringIds.length === 2 && neighboringIds[0] !== neighboringIds[1]) {
        const duplicate = remainingSegments.some((segment) =>
          (segment.startId === neighboringIds[0] && segment.endId === neighboringIds[1]) ||
          (segment.startId === neighboringIds[1] && segment.endId === neighboringIds[0]),
        );
        if (!duplicate) {
          remainingSegments.push({
            id: createLocalId("sketch-segment"),
            startId: neighboringIds[0],
            endId: neighboringIds[1],
            kind: connected.every((segment) => segment.kind === "line") ? "line" : connected.some((segment) => segment.kind === "smooth") ? "smooth" : "bezier",
          });
        }
      }
      const next = {
        ...sketchProfile,
        points: sketchProfile.points.filter((point) => point.id !== id),
        segments: remainingSegments,
      };
      commitSketchProfile(next.segments.some((segment) => segment.kind === "smooth") ? withSmoothSketchHandles(next) : next, t("status.sketchPointRemoved"));
      if (sketchActivePointId === id) setSketchActivePointId(null);
      setSketchSelection(null);
    },
    [commitSketchProfile, sketchActivePointId, sketchProfile],
  );

  const deleteSketchSegment = useCallback(
    (id: string) => {
      commitSketchProfile({ ...sketchProfile, segments: sketchProfile.segments.filter((segment) => segment.id !== id) }, t("status.sketchLineRemoved"));
      setSketchActivePointId(null);
      setSketchSelection(null);
    },
    [commitSketchProfile, sketchProfile],
  );

  const updateSketchImage = useCallback((id: string, patch: Partial<SketchImage>, message = "Sketch image updated") => {
    const image = (sketchProfile.images ?? []).find((entry) => entry.id === id);
    if (!image) return;
    if (image.locked && patch.locked !== false) {
      setNotice(t("status.unlockImageEdit"));
      return;
    }
    commitSketchProfile({
      ...sketchProfile,
      images: (sketchProfile.images ?? []).map((entry) => entry.id === id ? { ...entry, ...patch } : entry),
    }, message);
    setSketchSelection({ kind: "image", id });
    setSketchActivePointId(null);
  }, [commitSketchProfile, sketchProfile]);

  const deleteSketchImage = useCallback((id: string) => {
    const image = (sketchProfile.images ?? []).find((entry) => entry.id === id);
    if (!image) return;
    if (image.locked) {
      setNotice(t("status.unlockImageDelete"));
      return;
    }
    commitSketchProfile({
      ...sketchProfile,
      images: (sketchProfile.images ?? []).filter((image) => image.id !== id),
    }, t("status.sketchImageRemoved"));
    setSketchSelection(null);
  }, [commitSketchProfile, sketchProfile]);

  const addSketchImageFile = useCallback(async (file: File) => {
    if (!sketchActive || sketchTool !== "select") {
      setNotice(t("status.chooseSelectFirst"));
      return;
    }
    if (!file.type.startsWith("image/")) {
      setNotice(t("status.chooseImageFile"));
      return;
    }
    try {
      const prepared = await prepareImportedImage(file);
      const dimensions = imagePlateDimensions(prepared.pixelWidth, prepared.pixelHeight);
      const image: SketchImage = {
        id: createLocalId("sketch-image"),
        name: file.name.replace(/\.[^.]+$/, "") || "Sketch image",
        ...prepared,
        x: 0,
        z: 0,
        width: dimensions.width,
        depth: dimensions.depth,
        opacity: 0.55,
        lockAspect: true,
        locked: false,
      };
      commitSketchProfile({ ...sketchProfile, images: [...(sketchProfile.images ?? []), image] }, t("status.sketchImageAdded", { name: file.name }));
      setSketchSelection({ kind: "image", id: image.id });
      setSketchActivePointId(null);
    } catch (error) {
      setNotice(error instanceof Error ? localizedError(error.message) : t("status.imageNotAdded"));
    }
  }, [commitSketchProfile, sketchActive, sketchProfile, sketchTool]);

  const toggleSelectedSketchImageLock = useCallback(() => {
    if (sketchSelection?.kind !== "image") {
      setNotice(t("status.selectSketchImageLock"));
      return;
    }
    const image = (sketchProfile.images ?? []).find((entry) => entry.id === sketchSelection.id);
    if (!image) {
      setNotice(t("status.selectSketchImageLock"));
      return;
    }
    updateSketchImage(
      image.id,
      { locked: !image.locked },
      image.locked ? "Sketch image unlocked" : "Sketch image locked",
    );
  }, [sketchProfile.images, sketchSelection, updateSketchImage]);

  const deleteSelectedSketchEntity = useCallback(() => {
    if (!sketchSelection) {
      setNotice(t("status.selectSketchPoint"));
      return;
    }
    if (sketchSelection.kind === "point") deleteSketchPoint(sketchSelection.id);
    else if (sketchSelection.kind === "segment") deleteSketchSegment(sketchSelection.id);
    else if (sketchSelection.kind === "image") deleteSketchImage(sketchSelection.id);
    else {
      const pointIds = new Set(sketchSelection.pointIds);
      const segmentIds = new Set(sketchSelection.segmentIds);
      const imageIds = new Set(sketchSelection.imageIds ?? []);
      commitSketchProfile({
        ...sketchProfile,
        points: sketchProfile.points.filter((point) => !pointIds.has(point.id)),
        segments: sketchProfile.segments.filter((segment) => !segmentIds.has(segment.id) && !pointIds.has(segment.startId) && !pointIds.has(segment.endId)),
        images: (sketchProfile.images ?? []).filter((image) => !imageIds.has(image.id)),
      }, t("status.sketchSelectionRemoved"));
      setSketchActivePointId(null);
      setSketchSelection(null);
    }
  }, [commitSketchProfile, deleteSketchImage, deleteSketchPoint, deleteSketchSegment, sketchProfile, sketchSelection]);

  const copySketchSelectionToClipboard = useCallback(() => {
    const copied = copySketchSelection(sketchProfile, sketchSelection);
    if (!copied) {
      setNotice(t("status.selectSketchGeometry"));
      return;
    }
    setSketchClipboard(copied);
    setNotice(t("status.sketchCopied"));
  }, [sketchProfile, sketchSelection]);

  const cutSketchSelection = useCallback(() => {
    const copied = copySketchSelection(sketchProfile, sketchSelection);
    if (!copied) {
      setNotice(t("status.selectSketchGeometry"));
      return;
    }
    // A locked image refuses to be deleted; cutting it would only copy it.
    if (copied.images.some((image) => image.locked)) {
      setNotice(t("status.unlockImageDelete"));
      return;
    }
    setSketchClipboard(copied);
    deleteSelectedSketchEntity();
    setNotice(t("status.sketchCut"));
  }, [deleteSelectedSketchEntity, sketchProfile, sketchSelection]);

  const insertSketchCopy = useCallback((source: SketchClipboard, message: string) => {
    const { width, depth } = workspaceSettingsRef.current;
    const plate = { minX: -width / 2, maxX: width / 2, minZ: -depth / 2, maxZ: depth / 2 };
    const offset = freeSketchPasteOffset(sketchProfile, source, plate);
    const pasted = pasteSketchClipboard(sketchProfile, source, offset, createLocalId);
    commitSketchProfile(pasted.profile, message);
    setSketchActivePointId(null);
    setSketchSelection({ kind: "multiple", pointIds: pasted.pointIds, segmentIds: pasted.segmentIds, imageIds: pasted.imageIds });
  }, [commitSketchProfile, sketchProfile]);

  const pasteSketchSelection = useCallback(() => {
    if (!sketchClipboard) {
      setNotice(t("status.sketchClipboardEmpty"));
      return;
    }
    insertSketchCopy(sketchClipboard, t("status.sketchPasted"));
  }, [insertSketchCopy, sketchClipboard]);

  // Like the 3D editor's duplicate, but moved clear of the original: a copy on
  // top of it would be invisible and welded to it where their lines cross.
  const duplicateSketchSelection = useCallback(() => {
    const copied = copySketchSelection(sketchProfile, sketchSelection);
    if (!copied) {
      setNotice(t("status.selectSketchGeometry"));
      return;
    }
    insertSketchCopy(copied, t("status.sketchDuplicated"));
  }, [insertSketchCopy, sketchProfile, sketchSelection]);

  const moveSketchPoint = useCallback((id: string, position: { x: number; z: number }) => {
    const current = sketchProfile.points.find((point) => point.id === id);
    if (!current) return;
    const deltaX = position.x - current.x;
    const deltaZ = position.z - current.z;
    const next = {
      ...sketchProfile,
      points: sketchProfile.points.map((point) => point.id === id ? {
        ...point,
        ...position,
        handleIn: point.handleIn ? { x: point.handleIn.x + deltaX, z: point.handleIn.z + deltaZ } : undefined,
        handleOut: point.handleOut ? { x: point.handleOut.x + deltaX, z: point.handleOut.z + deltaZ } : undefined,
      } : point),
    };
    commitSketchProfile(next, t("status.sketchPointMoved"));
  }, [commitSketchProfile, sketchProfile]);

  const transformSketchPoints = useCallback((points: SketchPoint[], message = "Sketch geometry transformed") => {
    if (!points.length) return;
    const byId = new Map(points.map((point) => [point.id, point]));
    commitSketchProfile({
      ...sketchProfile,
      points: sketchProfile.points.map((point) => byId.get(point.id) ?? point),
    }, message);
  }, [commitSketchProfile, sketchProfile]);

  const rotateSelectedClosedSketch45 = useCallback(() => {
    if (sketchSelection?.kind !== "multiple") {
      setNotice(t("status.selectClosedSketch"));
      return;
    }
    const selectedPoints = selectedClosedSketchPoints(sketchProfile, sketchSelection);
    if (!selectedPoints) {
      setNotice(t("status.rotationClosedOnly"));
      return;
    }
    transformSketchPoints(rotateSketchPoints(selectedPoints), "Rotated closed sketch selection by 45°");
  }, [sketchProfile, sketchSelection, transformSketchPoints]);

  const moveSketchHandle = useCallback((id: string, handle: "in" | "out", position: { x: number; z: number }) => {
    const next = cloneSketchProfile(sketchProfile);
    const point = next.points.find((entry) => entry.id === id);
    if (!point) return;
    if (handle === "in") point.handleIn = { ...position };
    else point.handleOut = { ...position };
    if (point.mode === "smooth") {
      const opposite = { x: point.x * 2 - position.x, z: point.z * 2 - position.z };
      if (handle === "in") point.handleOut = opposite;
      else point.handleIn = opposite;
    }
    commitSketchProfile(next, t("status.sketchHandleAdjusted"));
  }, [commitSketchProfile, sketchProfile]);

  const setSketchPointMode = useCallback((id: string, mode: "corner" | "smooth" | "split") => {
    let next = cloneSketchProfile(sketchProfile);
    const point = next.points.find((entry) => entry.id === id);
    if (!point) return;
    point.mode = mode;
    if (mode === "corner") {
      point.handleIn = undefined;
      point.handleOut = undefined;
      next.segments = next.segments.map((segment) => segment.startId === id || segment.endId === id ? { ...segment, kind: "line" } : segment);
    } else {
      next.segments = next.segments.map((segment) => segment.startId === id || segment.endId === id ? { ...segment, kind: "bezier" } : segment);
      // The point's own handles along its neighbours; the segments around it then need the handle at
      // their other end too, or they would stay straight.
      if (!point.handleIn || !point.handleOut) next = withSmoothSketchHandles(next, new Set([id]));
      next = withSegmentHandles(next, new Set(next.segments.filter((segment) => segment.startId === id || segment.endId === id).map((segment) => segment.id)));
      const updated = next.points.find((entry) => entry.id === id);
      if (updated) updated.mode = mode;
    }
    commitSketchProfile(next, mode === "corner" ? t("status.sketchMadeCorner") : mode === "smooth" ? t("status.sketchMadeSmooth") : t("status.sketchHandlesSplit"));
  }, [commitSketchProfile, sketchProfile]);

  const curveSketchSegmentAction = useCallback((id: string) => {
    const next = curveSketchSegment(sketchProfile, id);
    if (next) commitSketchProfile(next, t("status.sketchLineCurved"));
  }, [commitSketchProfile, sketchProfile]);

  const straightenSketchSegmentAction = useCallback((id: string) => {
    const next = straightenSketchSegment(sketchProfile, id);
    if (next) commitSketchProfile(next, t("status.sketchLineStraightened"));
  }, [commitSketchProfile, sketchProfile]);

  const insertSketchPoint = useCallback((segmentId: string, _position: { x: number; z: number }, amount: number) => {
    const result = splitSketchSegment(sketchProfile, segmentId, amount, createLocalId);
    if (!result.pointId) return;
    if (result.inserted) commitSketchProfile(result.profile, t("status.sketchPointInserted"));
    setSketchSelection({ kind: "point", id: result.pointId });
    setSketchTool("select");
  }, [commitSketchProfile, sketchProfile]);

  const applySketchFilletHandler = useCallback((id: string, radius: number) => {
    const result = applySketchFillet(sketchProfile, id, radius, createLocalId);
    if (!result) return;
    commitSketchProfile(result.profile, t("sketch.filletApplied"));
    setSketchSelection(null);
  }, [commitSketchProfile, sketchProfile]);

  const applySketchChamferHandler = useCallback((id: string, distance: number) => {
    const result = applySketchChamfer(sketchProfile, id, distance, createLocalId);
    if (!result) return;
    commitSketchProfile(result.profile, t("sketch.chamferApplied"));
    setSketchSelection(null);
  }, [commitSketchProfile, sketchProfile]);

  useEffect(() => {
    if (!sketchActive || !sketchProfile.stroke) {
      setSketchStrokePreview(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void getManifoldRuntime().then((runtime) => {
        if (cancelled) return;
        const stroked = strokedSketchProfile(runtime, sketchProfile.silhouette ? silhouetteSketchProfile(sketchProfile) : sketchProfile);
        if (!stroked) {
          setSketchStrokePreview(null);
          return;
        }
        const byId = new Map(stroked.points.map((point) => [point.id, point]));
        const loops = new Map<string, string[]>();
        stroked.segments.forEach((segment) => {
          const loop = segment.id.replace(/-s\d+$/, "");
          const point = byId.get(segment.startId);
          if (point) loops.set(loop, [...(loops.get(loop) ?? []), `${point.x} ${point.z}`]);
        });
        setSketchStrokePreview([...loops.values()].map((loop) => `M ${loop.join(" L ")} Z`).join(" "));
      }).catch(() => setSketchStrokePreview(null));
    }, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [sketchActive, sketchProfile]);

  const finishSketch = useCallback(async () => {
    const existing = editingSketchShapeId ? shapes.find((shape) => shape.id === editingSketchShapeId) ?? null : null;
    const height = existing?.height ?? 10;
    let resolved: WorkplaneShape | null;
    try {
      if (sketchOperation === "revolve") {
        setNotice(t("status.buildingSketch"), true);
        const revolved = await shapeFromRevolvedSketchProfile(sketchProfile, sketchRevolveSettings, existing);
        resolved = placeSketchShape(revolved, activeSketchWorkplane, existing);
        if (existing?.sketchProfile && resolved) {
          // The rebuilt body is centred on its outline again: keep its axis where it was.
          const base = existing.importedMesh;
          const shift = revolveAxisShift(
            existing,
            { profile: existing.sketchProfile, settings: existing.sketchRevolve ?? {} },
            { profile: sketchProfile, settings: sketchRevolveSettings },
            base ? existing.width / Math.max(0.001, base.baseWidth) : 1,
            base ? existing.depth / Math.max(0.001, base.baseDepth) : 1,
            1,
            1,
          );
          resolved = canonicalizeShape({ ...resolved, x: resolved.x + shift.x, z: resolved.z + shift.z, elevation: (resolved.elevation ?? 0) + shift.y });
        }
      } else {
        setNotice(t("status.buildingSketch"), true);
        const extrusion = await cadShapeFromSketchProfile(sketchProfile, height, existing);
        resolved = placeSketchShape(extrusion, activeSketchWorkplane, existing);
      }
    } catch (error) {
      setNotice(error instanceof Error ? localizedError(error.message) : t(sketchOperation === "revolve" ? "status.sketchCannotRevolve" : "status.sketchCannotExtrude"));
      return;
    }
    if (!resolved) {
      setNotice(t("status.closeProfile"), true);
      return;
    }
    const nextShapes = existing ? shapes.map((shape) => (shape.id === existing.id ? resolved : shape)) : [...shapes, resolved];
    commitShapes(
      nextShapes,
      resolved.id,
      existing
        ? t(sketchOperation === "revolve" ? "status.revolveUpdated" : "status.sketchUpdated")
        : sketchOperation === "revolve"
          ? t("status.revolveCreated")
          : t("status.exactSketchCreated"),
    );
    setSketchActive(false);
    setSketchStrokePanelOpen(false);
    setSketchRevolvePreview(null);
    setEditingSketchShapeId(null);
    setToolbarMode("geometry");
  }, [activeSketchWorkplane, commitShapes, editingSketchShapeId, shapes, sketchOperation, sketchProfile, sketchRevolveSettings]);

  useEffect(() => {
    if (!projectId) {
      lastProjectIdRef.current = null;
      lastProjectShapesSyncRef.current = "";
      lastProjectShapesEchoRef.current = null;
      return;
    }
    if (projectInteractionActiveRef.current) {
      return;
    }
    const projectChanged = lastProjectIdRef.current !== projectId;
    if (projectChanged) {
      lastProjectIdRef.current = projectId;
      openGroupHistoryRef.current.clear();
      lastProjectShapesSyncRef.current = "";
      lastProjectShapesEchoRef.current = null;
      const nextAssets = dedupeProjectAssets(initialAssets);
      projectAssetsRef.current = nextAssets;
      setProjectAssets(nextAssets);
      const nextPlacementElevation = Number.isFinite(initialPlacementElevation) ? initialPlacementElevation : 0;
      setPlacementElevation(nextPlacementElevation);
      setPlacementWorkplane(normalizePlacementWorkplane(initialPlacementWorkplane, nextPlacementElevation));
    }
    const incoming = initialShapes.map(canonicalizeShape);
    const incomingSerialized = projectShapesFingerprint(incoming);
    // The parent echoes shapes after a local save; rehydrating that echo can reset active transform state.
    if (!projectChanged && lastProjectShapesEchoRef.current !== null && incomingSerialized === lastProjectShapesEchoRef.current) {
      lastProjectShapesSyncRef.current = incomingSerialized;
      return;
    }
    lastProjectShapesSyncRef.current = incomingSerialized;
    if (projectSyncTimerRef.current !== null) {
      window.clearTimeout(projectSyncTimerRef.current);
      projectSyncTimerRef.current = null;
    }
    // The current shapes, not the ones this effect last saw: it leaves `shapes` out on purpose.
    if (!projectChanged && incomingSerialized === projectShapesFingerprint(shapesRef.current)) {
      return;
    }
    const incomingNotes = notesForHistoryIndex(initialHistory, initialHistoryIndex);
    const hydratedHistory = hydrateEditorHistoryState(
      incoming,
      initialHistory,
      initialHistoryIndex,
      normalizeWorkspaceSettings(initialWorkspace).historyLimit,
      incomingNotes,
    );
    projectHydratingRef.current = true;
    shapesRef.current = incoming;
    selectedIdsRef.current = [];
    notesRef.current = incomingNotes;
    historyRef.current = hydratedHistory.entries;
    historyIndexRef.current = hydratedHistory.index;
    setShapes(incoming);
    setNotes(incomingNotes);
    setSelectedIds([]);
    setHistory(hydratedHistory.entries);
    setHistoryIndex(hydratedHistory.index);
    // Was aus der Datei kam, ist der Stand, der auch auf dem Server liegt.
    serverSavedFingerprintRef.current = { projectId: projectId ?? null, fingerprint: projectSceneFingerprint(incoming, incomingNotes) };
    // Ein geoeffneter Entwurf ist keine Meldung wert: Dass er da ist, sieht man.
    setNotice("");
  }, [initialAssets, initialHistory, initialHistoryIndex, initialPlacementElevation, initialPlacementWorkplane, initialShapes, projectId, projectRevision]);

  useEffect(() => {
    if (!projectId || !onProjectShapesChange) {
      return;
    }
    if (projectHydratingRef.current) {
      projectHydratingRef.current = false;
      return;
    }
    syncProjectShapes(shapes);
  }, [onProjectShapesChange, projectId, shapes, syncProjectShapes]);

  useEffect(() => {
    return () => {
      if (projectSyncTimerRef.current !== null) {
        window.clearTimeout(projectSyncTimerRef.current);
      }
      if (heldProjectSyncTimerRef.current !== null) {
        window.clearTimeout(heldProjectSyncTimerRef.current);
      }
      if (interactionHistoryTimerRef.current !== null) {
        window.clearTimeout(interactionHistoryTimerRef.current);
      }
      sketchRevolveUpdateTimerRef.current.forEach((timer) => window.clearTimeout(timer));
      sketchRevolveUpdateTimerRef.current.clear();
    };
  }, []);

  const addShape = useCallback(
    (asset: ShapeAsset, point?: PlacementPoint, onFace?: PlacementWorkplane) => {
      setCruiseAsset(null);
      const shape = makeShapeFromAsset(asset, undefined, workspaceSettingsRef.current.shapeCustomizations[asset.kind]);
      // Dropped on a body's face, the shape lies on that face; otherwise on the current workplane.
      const workplane = onFace ?? placementWorkplane;
      const nextShape = prepareNewShape(asset, {
        ...shape,
        ...placementPatchForNewShape(shape, workplane, point ?? workplane.origin),
      });
      commitShapes([...shapes, nextShape], nextShape.id, t("status.shapeAdded", { name: shapeAssetLabel(asset) }));
    },
    [commitShapes, placementWorkplane, shapes],
  );

  /** Sets the parts picked up with C down on the face (or the workplane) that was clicked, as one step. */
  const dropCarried = useCallback((target: { point: PlacementPoint; normal: PlacementPoint; workplane: PlacementWorkplane }) => {
    const ids = carryIdsRef.current;
    setCarryIds(null);
    if (!ids?.length) return;
    const patches = carriedOntoFace(shapes, ids, target, ids[0]);
    const next = shapes.map((shape) => {
      const patch = patches.get(shape.id);
      return patch ? canonicalizeShape({ ...shape, ...patch }) : shape;
    });
    commitShapes(next, ids, t("status.carryPlaced", { count: ids.length }));
  }, [commitShapes, shapes]);

  /*
   * The fill of an extruded sketch body changed from outside sketch mode - area, a line round it
   * or the silhouette (#197): the body is built again from its sketch, where it stands, at the
   * size it has. Edge treatments go, as when the sketch is edited.
   */
  const sketchFillUpdateRequestRef = useRef(new Map<string, number>());
  const sketchFillUpdateTimerRef = useRef(new Map<string, number>());
  const rebuildSketchBodyFill = useCallback(async (id: string, profile: SketchProfile) => {
    const current = shapesRef.current.find((shape) => shape.id === id);
    if (!current?.sketchProfile || current.sketchOperation === "revolve") throw new Error(t("status.selectSketchShape"));
    const stretch = sketchBodyStretch(current);
    const source = stretch ? stretchedSketchProfile(profile, stretch.x, stretch.z) : profile;
    const extrusion = await cadShapeFromSketchProfile(source, current.height, current);
    return placeSketchShape(extrusion, placementWorkplaneRef.current, current);
  }, []);
  const scheduleSketchFillUpdate = useCallback((id: string, profile: SketchProfile) => {
    const previousTimer = sketchFillUpdateTimerRef.current.get(id);
    if (previousTimer !== undefined) window.clearTimeout(previousTimer);
    const requestId = (sketchFillUpdateRequestRef.current.get(id) ?? 0) + 1;
    sketchFillUpdateRequestRef.current.set(id, requestId);
    const timer = window.setTimeout(() => {
      sketchFillUpdateTimerRef.current.delete(id);
      setNotice(t("status.buildingSketch"), true);
      void rebuildSketchBodyFill(id, profile)
        .then((rebuilt) => {
          if (sketchFillUpdateRequestRef.current.get(id) !== requestId) return;
          commitShapes(shapesRef.current.map((shape) => shape.id === id ? rebuilt : shape), selectedIdsRef.current, t("status.sketchUpdated"));
        })
        .catch((error) => {
          if (sketchFillUpdateRequestRef.current.get(id) === requestId) {
            setNotice(error instanceof Error ? localizedError(error.message) : t("status.sketchCannotExtrude"), true);
          }
        });
    }, 250);
    sketchFillUpdateTimerRef.current.set(id, timer);
  }, [commitShapes, rebuildSketchBodyFill]);

  const scheduleRevolveShapeUpdate = useCallback((id: string, settings: SketchRevolveSettings) => {
    const previousTimer = sketchRevolveUpdateTimerRef.current.get(id);
    if (previousTimer !== undefined) window.clearTimeout(previousTimer);
    const requestId = (sketchRevolveUpdateRequestRef.current.get(id) ?? 0) + 1;
    sketchRevolveUpdateRequestRef.current.set(id, requestId);
    const timer = window.setTimeout(() => {
      sketchRevolveUpdateTimerRef.current.delete(id);
      const source = shapesRef.current.find((shape) => shape.id === id);
      if (!source?.sketchProfile || source.sketchOperation !== "revolve") return;
      setNotice(t("status.updatingRevolve"), true);
      void shapeFromRevolvedSketchProfile(source.sketchProfile, settings, source)
        .then((generated) => {
          if (sketchRevolveUpdateRequestRef.current.get(id) !== requestId) return;
          const current = shapesRef.current.find((shape) => shape.id === id);
          if (!current?.importedMesh || current.sketchOperation !== "revolve") return;
          const widthScale = current.width / Math.max(0.001, current.importedMesh.baseWidth);
          const depthScale = current.depth / Math.max(0.001, current.importedMesh.baseDepth);
          const heightScale = current.height / Math.max(0.001, current.importedMesh.baseHeight);
          const width = generated.width * widthScale;
          const depth = generated.depth * depthScale;
          const height = generated.height * heightScale;
          // The body is centred on its outline, which moves with the sweep: carry its middle so the axis stays put.
          const shift = revolveAxisShift(
            current,
            { profile: source.sketchProfile!, settings: current.sketchRevolve ?? {} },
            { profile: source.sketchProfile!, settings },
            widthScale,
            depthScale,
          );
          const updated = canonicalizeShape({
            ...generated,
            id: current.id,
            name: current.name,
            color: current.color,
            hole: current.hole,
            x: current.x + shift.x,
            z: current.z + shift.z,
            elevation: (current.elevation ?? 0) + shift.y,
            width,
            depth,
            height,
            size: Math.max(width, depth),
            rotation: current.rotation,
            rotationX: current.rotationX,
            rotationZ: current.rotationZ,
            mirrorX: current.mirrorX,
            mirrorY: current.mirrorY,
            mirrorZ: current.mirrorZ,
            locked: current.locked,
            hidden: current.hidden,
            sketchRevolve: settings,
          });
          commitShapes(shapesRef.current.map((shape) => shape.id === id ? updated : shape), selectedIdsRef.current, t("status.revolveUpdated"));
        })
        .catch((error) => {
          if (sketchRevolveUpdateRequestRef.current.get(id) === requestId) {
            setNotice(error instanceof Error ? localizedError(error.message) : t("status.revolveSettingsFailed"));
          }
        });
    }, 120);
    sketchRevolveUpdateTimerRef.current.set(id, timer);
  }, [commitShapes]);

  const updateShape = useCallback(
    (id: string, patch: ShapeUpdatePatch) => {
      const bakeTransform = Boolean(patch.bakeTransform);
      const cleanedPatch = cleanShapePatch(patch);
      if (cleanedPatch.sketchRevolve) {
        const source = shapesRef.current.find((shape) => shape.id === id);
        if (source?.sketchOperation === "revolve" && source.sketchProfile) {
          scheduleRevolveShapeUpdate(id, normalizeSketchRevolveSettings(cleanedPatch.sketchRevolve));
          return;
        }
      }
      if (cleanedPatch.sketchProfile) {
        // Only the fill comes in this way (#197); the body is built again from its sketch.
        const source = shapesRef.current.find((shape) => shape.id === id);
        if (source?.sketchProfile && source.sketchOperation !== "revolve") {
          scheduleSketchFillUpdate(id, cleanedPatch.sketchProfile);
          return;
        }
      }
      const applyPatch = (current: WorkplaneShape[]) => {
        let changed = false;
        const next = current.map((shape) => {
          if (shape.id !== id) {
            return shape;
          }

          // Ein Bauwert an einem gedrehten Koerper heisst: neu bauen, nicht
          // das Netz verbiegen. Ein Zug am Anfasser trifft dagegen nur den
          // Rahmen und laesst das gebackene Netz in Ruhe.
          const neugebaut = patchTouchesBodyParameters(cleanedPatch) ? rebuiltParametricShape(shape, cleanedPatch) : null;
          const patched = neugebaut ?? { ...shape, ...curvedTextPatch(shape, cleanedPatch) };
          const canonicalBase = canonicalizeShape("hole" in cleanedPatch ? withHoleMode(patched, Boolean(cleanedPatch.hole), cleanedPatch.color) : patched);
          const canonical = bakeTransform ? canonicalizeShape(bakeShapeTransformIntoMesh(canonicalBase)) : canonicalBase;
          if (workplaneShapesEqual(shape, canonical)) {
            return shape;
          }
          changed = true;
          return canonical;
        });
        return { changed, next };
      };

      if (projectInteractionActiveRef.current) {
        setShapes((current) => {
          const { changed, next } = applyPatch(current);
          if (!changed) {
            return current;
          }
          interactionHistoryChangedRef.current = true;
          shapesRef.current = next;
          return next;
        });
        return;
      }

      const { changed, next } = applyPatch(shapes);
      if (changed) {
        commitShapes(next, selectedIds);
      }
    },
    [commitShapes, scheduleRevolveShapeUpdate, scheduleSketchFillUpdate, selectedIds, shapes],
  );
  writeOwnPivotRef.current = (shapeId, value) => updateShape(shapeId, { rotationPivot: value });

  const deleteSelected = useCallback(() => {
    if (!hasSelection) {
      setNotice(t("status.selectShapeFirst"));
      return;
    }
    const selected = new Set(selectedIds);
    commitShapes(
      shapes.filter((shape) => !selected.has(shape.id)),
      [],
      selected.size === 1 ? t("status.deletedOne") : t("status.deletedMany", { count: selected.size }),
    );
  }, [commitShapes, hasSelection, selectedIds, shapes]);

  /*
   * darkwingbreydins Forenwunsch: wie in Tinkercad soll ein Duplizieren nach
   * dem Verschieben eines vorigen Duplikats denselben Versatz wiederholen, so
   * dass wiederholtes Duplizieren allein eine Lochreihe ergibt. Das Ziel ist
   * eine reine Sitzungserinnerung, kein Projektfeld: sie haengt an der
   * zuletzt erzeugten Kopie (`chainId`) und ihrem Stand bei der Entstehung
   * (`baseline`), damit sich der tatsaechlich seither zurueckgelegte Versatz
   * im Moment des naechsten Duplizierens berechnen laesst - ohne jeden
   * Zug-/Dreh-Commit einzeln mitschneiden zu muessen. Bewegt sich die
   * ausgewaehlte Kopie seit ihrer Entstehung nicht, wird der zuletzt
   * angewandte Versatz erneut benutzt, statt auf Null zurueckzufallen -
   * genau das erlaubt das blosse wiederholte Druecken.
   */
  const smartDuplicateRef = useRef<{ chainId: string; baseline: ShapeTransformSnapshot; delta: ShapeMoveDelta } | null>(null);

  const duplicateSelected = useCallback(() => {
    if (!hasSelection) {
      setNotice(t("status.selectShapeFirst"));
      return;
    }
    if (selectedShapes.length === 1) {
      const shape = selectedShapes[0];
      const chain = smartDuplicateRef.current;
      const continuing = chain?.chainId === shape.id;
      const movedSinceCreation = continuing ? shapeMoveDeltaBetween(chain.baseline, shapeTransformSnapshot(shape)) : ZERO_MOVE_DELTA;
      const delta = continuing && isZeroMoveDelta(movedSinceCreation) ? chain.delta : movedSinceCreation;
      const duplicate = applyShapeMoveDelta(cloneWorkplaneShapeTreeWithFreshIds(shape, "copy"), delta);
      commitShapes([...shapes, duplicate], [duplicate.id], t("status.duplicatedOne"));
      smartDuplicateRef.current = { chainId: duplicate.id, baseline: shapeTransformSnapshot(duplicate), delta };
      return;
    }
    smartDuplicateRef.current = null;
    const duplicates = selectedShapes.map((shape) => cloneWorkplaneShapeTreeWithFreshIds(shape, "copy"));
    commitShapes([...shapes, ...duplicates], duplicates.map((shape) => shape.id), t("status.duplicatedMany", { count: duplicates.length }));
  }, [commitShapes, hasSelection, selectedShapes, shapes]);

  /** Scales the selection by a percentage (#179); the same code the MCP action uses. */
  const scaleSelectionByPercent = useCallback((ids: readonly string[], percent: number, mode: ScalePercentSettings["mode"]) => {
    const targets = shapesRef.current.filter((shape) => ids.includes(shape.id) && !shape.locked);
    if (targets.length === 0) return { ok: false as const, message: t("status.selectShapeFirst") };
    const result = scaleShapesByPercent(targets, percent, mode, (shape) => shapeDimensionLimit(workspaceSettingsRef.current, shape.kind, 1000));
    if (!result.ok) {
      const message = result.reason === "percent"
        ? t("scalePercent.errorPercent")
        : t(result.reason === "tooSmall" ? "scalePercent.errorTooSmall" : "scalePercent.errorTooLarge", { name: result.name ?? "" });
      return { ok: false as const, message };
    }
    const byId = new Map(result.patches.map((entry) => [entry.id, entry.patch]));
    const next = shapesRef.current.map((shape) => {
      const patch = byId.get(shape.id);
      return patch ? canonicalizeShape({ ...shape, ...patch }) : shape;
    });
    const skipped = ids.length - targets.length;
    commitShapes(next, selectedIdsRef.current, t(skipped > 0 ? "status.scaledByPercentSkipped" : "status.scaledByPercent", { percent: Math.round(percent * 10) / 10, count: targets.length, skipped }));
    return { ok: true as const, count: targets.length, skipped };
  }, [commitShapes]);

  const toggleScalePercentTool = useCallback(() => {
    if (scalePercentTool) {
      setScalePercentTool(null);
      setScalePercentError(null);
      return;
    }
    if (selectedShapes.length === 0) {
      setNotice(t("status.selectShapeFirst"));
      return;
    }
    setArrayTool(null);
    setScalePercentError(null);
    setScalePercentTool({ percent: 100, mode: "together" });
  }, [scalePercentTool, selectedShapes.length]);

  const applyScalePercentTool = useCallback(() => {
    if (!scalePercentTool) return;
    const result = scaleSelectionByPercent(selectedIdsRef.current, scalePercentTool.percent, scalePercentTool.mode);
    if (!result.ok) {
      setScalePercentError(result.message);
      return;
    }
    setScalePercentTool(null);
    setScalePercentError(null);
  }, [scalePercentTool, scaleSelectionByPercent]);

  const applyArrayTool = useCallback(() => {
    if (!arrayTool || selectedShapes.length === 0) return;
    const copies = arrayCopies(selectedShapes, arrayTool);
    setArrayTool(null);
    commitShapes([...shapes, ...copies], [...selectedIds, ...copies.map((shape) => shape.id)], t("status.arrayCreated", { count: copies.length }));
  }, [arrayTool, commitShapes, selectedIds, selectedShapes, shapes]);

  const duplicateShapeAt = useCallback((id: string, position: { x: number; z: number }) => {
    const shape = shapesRef.current.find((entry) => entry.id === id);
    if (!shape) return;
    const duplicate = { ...cloneWorkplaneShapeTreeWithFreshIds(shape, "copy"), x: position.x, z: position.z };
    commitShapes([...shapesRef.current, duplicate], [duplicate.id], t("status.duplicatedOne"));
  }, [commitShapes]);

  /** Alt-drag: copies of the dragged shapes at the place they were dropped, selected like the drag was. */
  const duplicateShapesMoved = useCallback((ids: string[], delta: { dx: number; dz: number; delevation: number }) => {
    const duplicates = ids.flatMap((id) => {
      const shape = shapesRef.current.find((entry) => entry.id === id);
      return shape ? [applyShapeMoveDelta(cloneWorkplaneShapeTreeWithFreshIds(shape, "copy"), { ...ZERO_MOVE_DELTA, ...delta })] : [];
    });
    if (duplicates.length === 0) return;
    smartDuplicateRef.current = null;
    commitShapes(
      [...shapesRef.current, ...duplicates],
      duplicates.map((shape) => shape.id),
      duplicates.length === 1 ? t("status.duplicatedOne") : t("status.duplicatedMany", { count: duplicates.length }),
    );
  }, [commitShapes]);

  const copySelected = useCallback(() => {
    if (!hasSelection) {
      setNotice(t("status.selectShapeFirst"));
      return;
    }
    const copiedAt = Date.now();
    clipboardCopiedAtRef.current = copiedAt;
    setClipboard(selectedShapes);
    writeSharedClipboard(selectedShapes, copiedAt);
    setNotice(selectedShapes.length === 1
      ? t("status.copiedOne")
      : t("status.copiedMany", { count: selectedShapes.length }));
  }, [hasSelection, selectedShapes]);

  const pasteShape = useCallback(async () => {
    const sourceProjectId = projectInfoRef.current.projectId;
    // The newest copy wins, wherever it landed: this tab, another tab (local
    // storage) or another browser (system clipboard).
    const newest = newestClipboard([
      { copiedAt: clipboardCopiedAtRef.current, shapes: clipboard },
      readSharedClipboard(),
      await readSystemClipboard(),
    ]);
    const sourceClipboard = newest?.shapes ?? [];
    if (sourceClipboard.length === 0) {
      setNotice(t("status.clipboardEmpty"));
      return;
    }
    if (projectInfoRef.current.projectId !== sourceProjectId) {
      setNotice(t("status.pasteCancelled"));
      return;
    }
    if (newest && newest.copiedAt !== clipboardCopiedAtRef.current) {
      clipboardCopiedAtRef.current = newest.copiedAt;
      setClipboard(sourceClipboard);
    }
    const pasted = sourceClipboard.map((shape) => {
      const pastedShape = cloneWorkplaneShapeTreeWithFreshIds(shape, "paste");
      return {
        ...pastedShape,
        x: Math.min(110, shape.x + 12),
        z: Math.min(110, shape.z + 12),
      };
    });
    commitShapes([...shapesRef.current, ...pasted], pasted.map((shape) => shape.id), pasted.length === 1 ? t("status.pastedOne") : t("status.pastedMany", { count: pasted.length }));
  }, [clipboard, commitShapes]);

  const undo = useCallback(() => {
    if (projectInteractionActiveRef.current) {
      setNotice(t("status.finishBeforeUndo"));
      return;
    }
    const modifierCancelled = invalidateCadModifierSession();
    const currentHistory = historyRef.current;
    const currentIndex = historyIndexRef.current;
    if (currentIndex <= 0) {
      setNotice(modifierCancelled ? t("status.edgeCancelled") : t("status.nothingToUndo"));
      return;
    }
    const nextIndex = currentIndex - 1;
    const entry = currentHistory[nextIndex];
    const nextShapes = (entry?.shapes ?? []).map(canonicalizeShape);
    const nextSelection = (entry?.selectedIds ?? []).filter((id) => nextShapes.some((shape) => shape.id === id));
    const nextNotes = normalizeNotes(entry?.notes);
    const nextWorkplane = normalizePlacementWorkplane(entry?.placementWorkplane);
    const nextElevation = Math.abs(nextWorkplane.normal.x) < 1e-6
      && Math.abs(nextWorkplane.normal.y - 1) < 1e-6
      && Math.abs(nextWorkplane.normal.z) < 1e-6
      ? nextWorkplane.origin.y
      : 0;
    historyIndexRef.current = nextIndex;
    shapesRef.current = nextShapes;
    selectedIdsRef.current = nextSelection;
    notesRef.current = nextNotes;
    placementWorkplaneRef.current = nextWorkplane;
    placementElevationRef.current = nextElevation;
    setHistoryIndex(nextIndex);
    setShapes(nextShapes);
    setOpenGroupLevels((entry && openGroupHistoryRef.current.get(entry.fingerprint)) ?? []);
    setNotes(nextNotes);
    setSelectedIds(nextSelection);
    setPlacementWorkplane(nextWorkplane);
    setPlacementElevation(nextElevation);
    syncProjectShapes(nextShapes);
    setNotice(modifierCancelled ? t("status.edgeCancelledUndo") : t("status.undo"));
  }, [invalidateCadModifierSession, setOpenGroupLevels, syncProjectShapes]);

  const redo = useCallback(() => {
    if (projectInteractionActiveRef.current) {
      setNotice(t("status.finishBeforeRedo"));
      return;
    }
    const currentHistory = historyRef.current;
    const currentIndex = historyIndexRef.current;
    if (currentIndex >= currentHistory.length - 1) {
      setNotice(t("status.nothingToRedo"));
      return;
    }
    const modifierCancelled = invalidateCadModifierSession();
    const nextIndex = currentIndex + 1;
    const entry = currentHistory[nextIndex];
    const nextShapes = (entry?.shapes ?? []).map(canonicalizeShape);
    const nextSelection = (entry?.selectedIds ?? []).filter((id) => nextShapes.some((shape) => shape.id === id));
    const nextNotes = normalizeNotes(entry?.notes);
    const nextWorkplane = normalizePlacementWorkplane(entry?.placementWorkplane);
    const nextElevation = Math.abs(nextWorkplane.normal.x) < 1e-6
      && Math.abs(nextWorkplane.normal.y - 1) < 1e-6
      && Math.abs(nextWorkplane.normal.z) < 1e-6
      ? nextWorkplane.origin.y
      : 0;
    historyIndexRef.current = nextIndex;
    shapesRef.current = nextShapes;
    selectedIdsRef.current = nextSelection;
    notesRef.current = nextNotes;
    placementWorkplaneRef.current = nextWorkplane;
    placementElevationRef.current = nextElevation;
    setHistoryIndex(nextIndex);
    setShapes(nextShapes);
    setOpenGroupLevels((entry && openGroupHistoryRef.current.get(entry.fingerprint)) ?? []);
    setNotes(nextNotes);
    setSelectedIds(nextSelection);
    setPlacementWorkplane(nextWorkplane);
    setPlacementElevation(nextElevation);
    syncProjectShapes(nextShapes);
    setNotice(modifierCancelled ? t("status.edgeCancelledRedo") : t("status.redo"));
  }, [invalidateCadModifierSession, setOpenGroupLevels, syncProjectShapes]);

  /**
   * Der Verlaufsblick oeffnet beim aktuellen Stand; von dort fuehrt der Schieber
   * zurueck. Werkzeuge, die auf der Arbeitsflaeche etwas vorhaben, werden
   * abgelegt - sie wuerden sonst auf einem Stand arbeiten, der nur gezeigt wird.
   */
  const openHistoryView = useCallback(() => {
    if (projectInteractionActiveRef.current) {
      setNotice(t("status.finishBeforeHistory"));
      return;
    }
    if (historyRef.current.length <= 1) {
      setNotice(t("status.historyViewEmpty"));
      return;
    }
    if (cruiseAssetRef.current) setCruiseAsset(null);
    setNoteMode(false);
    setPivotPickMode(false);
    setLayFlatPickMode(false);
    setArrayTool(null);
    setTopPanel(null);
    setHistoryViewIndex(historyIndexRef.current);
    setNotice(t("status.historyViewOpened"), true);
  }, []);

  const closeHistoryView = useCallback(() => {
    setHistoryViewIndex(null);
    setTopPanel(null);
    setNotice(t("status.historyViewClosed"));
  }, []);

  const stepHistoryView = useCallback((delta: number) => {
    setHistoryViewIndex((current) => {
      if (current === null) return current;
      return Math.min(Math.max(0, current + delta), Math.max(0, historyRef.current.length - 1));
    });
  }, []);

  const createProjectFromHistoryState = useCallback(async () => {
    const view = historyViewStateRef.current;
    if (!view || historyProjectCreating) return;
    if (!onCreateProjectFromState) {
      setNotice(t("status.historyProjectUnavailable"));
      return;
    }
    setHistoryProjectCreating(true);
    setNotice(t("status.historyProjectCreating"), true);
    try {
      // Die Arbeitsflaeche zeigt gerade diesen Stand - also ist ihr Bild das
      // Bild fuer die Karte des neuen Projekts.
      const picture = await (window.layerlingCaptureCanvasAsync?.() ?? Promise.resolve(""));
      const branch = editorHistoryBranch(historyRef.current, view.index, workspaceSettingsRef.current.historyLimit);
      const time = historyStateNameSuffix(view.entry.at);
      const message = await onCreateProjectFromState({
        sourceProjectId: projectInfoRef.current.projectId,
        name: time ? t("historyView.copyName", { name: projectInfoRef.current.projectName, time }) : null,
        shapes: view.shapes,
        history: branch.entries,
        historyIndex: branch.index,
        assets: projectAssetsRef.current,
        workspace: workspaceSettingsRef.current,
        snapGrid,
        placementElevation: view.placementElevation,
        placementWorkplane: view.placementWorkplane,
        thumbnailDataUrl: picture.startsWith("data:image/png;base64,") && picture.length > 100 ? picture : null,
      });
      setNotice(message);
    } catch (error) {
      setNotice(error instanceof Error ? localizedError(error.message) : t("status.historyProjectCreateFailed"));
    } finally {
      setHistoryProjectCreating(false);
    }
  }, [historyProjectCreating, onCreateProjectFromState, snapGrid]);

  const toggleAlignMode = useCallback(() => {
    if (selectedShapes.length < 2) {
      setNotice(t("status.selectTwoToAlign"));
      return;
    }
    setAlignMode((active) => {
      const next = !active;
      setAlignPreview(null);
      if (next) {
        setMirrorMode(false);
        setMirrorPreviewAxis(null);
        splitRunRef.current += 1;
        setSplitSession(null);
      }
      setNotice(next ? t("status.alignStart") : t("status.alignCancelled"));
      return next;
    });
  }, [selectedShapes.length]);

  const chooseAlignAnchor = useCallback(
    (id: string) => {
      if (!selectedIds.includes(id)) {
        return;
      }
      const shape = shapes.find((entry) => entry.id === id);
      const lockedAnchor = selectedShapes.find((entry) => entry.locked);
      if (lockedAnchor && lockedAnchor.id !== id) {
        setNotice(t("status.alignAnchor", { name: displayShapeName(lockedAnchor) }));
        return;
      }
      setAlignAnchorId(id);
      setAlignPreview(null);
      setNotice(shape ? t("status.alignAnchorNamed", { name: displayShapeName(shape) }) : t("status.alignAnchorSet"));
    },
    [selectedIds, selectedShapes, shapes],
  );

  const alignSelectionTo = useCallback(
    (axis: AlignAxis, target: AlignTarget) => {
      if (selectedShapes.length < 2) {
        setNotice(t("status.selectTwoToAlign"));
        return;
      }

      const { nextShapes, moved } = alignedShapesForSelection(shapes, selectedIds, selectedShapes, effectiveAlignAnchorId, axis, target);
      setAlignPreview(null);

      if (moved === 0) {
        setNotice(t("status.alreadyAligned"));
        return;
      }

      commitShapes(nextShapes, selectedIds, moved === 1
        ? t("status.alignedOne", { alignment: alignmentLabel(axis, target) })
        : t("status.alignedMany", { count: moved, alignment: alignmentLabel(axis, target) }));
    },
    [commitShapes, effectiveAlignAnchorId, selectedIds, selectedShapes, shapes],
  );

  const previewAlignSelection = useCallback((axis: AlignAxis, target: AlignTarget) => {
    setAlignPreview({ axis, target });
  }, []);

  const clearAlignPreview = useCallback(() => {
    setAlignPreview(null);
  }, []);

  const toggleMirrorMode = useCallback(() => {
    if (!hasSelection) {
      setNotice(t("status.selectShapeFirst"));
      return;
    }
    setMirrorMode((active) => {
      const next = !active;
      setMirrorPreviewAxis(null);
      if (next) {
        setAlignMode(false);
        setAlignAnchorId(null);
        setAlignPreview(null);
        splitRunRef.current += 1;
        setSplitSession(null);
      }
      setNotice(next ? t("status.mirrorStart") : t("status.mirrorCancelled"));
      return next;
    });
  }, [hasSelection]);

  const mirrorSelectionAcross = useCallback(
    (axis: AlignAxis) => {
      if (!hasSelection) {
        setNotice(t("status.selectShapeFirst"));
        return;
      }
      const { nextShapes, moved } = mirroredShapesForSelection(shapes, selectedIds, selectedShapes, axis);
      setMirrorPreviewAxis(null);
      if (moved === 0) {
        setNotice(t("status.nothingToMirror"));
        return;
      }
      commitShapes(nextShapes, selectedIds, moved === 1
        ? t("status.mirroredOne", { axis: mirrorAxisLabel(axis) })
        : t("status.mirroredMany", { count: moved, axis: mirrorAxisLabel(axis) }));
    },
    [commitShapes, hasSelection, selectedIds, selectedShapes, shapes],
  );

  const previewMirrorSelection = useCallback((axis: AlignAxis) => {
    setMirrorPreviewAxis(axis);
  }, []);

  const clearMirrorPreview = useCallback(() => {
    setMirrorPreviewAxis(null);
  }, []);

  const cancelSplit = useCallback(() => {
    splitRunRef.current += 1;
    setSplitSession(null);
    setNotice(t("status.splitCancelled"));
  }, []);

  const toggleSplitMode = useCallback(() => {
    if (splitSession) {
      cancelSplit();
      return;
    }
    if (!canSplitSelection) {
      setNotice(t("status.splitSelectSolids"));
      return;
    }
    const targetPoints = selectedShapes.flatMap((shape) => meshForShape(shape).vertices);
    const plane = modelSplitPlane(targetPoints, "y");
    if (!plane) {
      setNotice(t("status.splitNoGeometry"));
      return;
    }
    invalidateCadModifierSession();
    splitRunRef.current += 1;
    setAlignMode(false);
    setAlignAnchorId(null);
    setAlignPreview(null);
    setMirrorMode(false);
    setMirrorPreviewAxis(null);
    setWorkplaneMode(false);
    setNoteMode(false);
    setShellTool(null);
    setArrayTool(null);
    setPivotPickMode(false);
    setLayFlatPickMode(false);
    setCruiseAsset(null);
    setSplitSession({
      targetIds: selectedShapes.map((shape) => shape.id),
      axis: plane.axis,
      rotation: NO_SPLIT_ROTATION,
      position: plane.position,
      pivot: plane.origin,
      sourceFingerprint: projectShapesFingerprint(shapesRef.current),
      busy: false,
      error: null,
      picking: false,
    });
    setNotice(t("status.splitReady"));
  }, [cancelSplit, canSplitSelection, invalidateCadModifierSession, selectedShapes, splitSession]);

  const changeSplitAxis = useCallback((axis: AlignAxis) => {
    const plane = modelSplitPlane(splitTargetPoints, axis);
    if (!plane) return;
    setSplitSession((current) => current && !current.busy ? {
      ...current,
      axis,
      rotation: NO_SPLIT_ROTATION,
      position: plane.position,
      pivot: plane.origin,
      error: null,
    } : current);
  }, [splitTargetPoints]);

  const changeSplitPosition = useCallback((position: number) => {
    setSplitSession((current) => {
      if (!current || current.busy) return current;
      const plane = modelSplitPlane(splitTargetPoints, current.axis, position, current.rotation);
      return plane ? { ...current, position: plane.position, pivot: plane.origin, error: null } : current;
    });
  }, [splitTargetPoints]);

  const toggleSplitPick = useCallback(() => {
    if (!splitSession || splitSession.busy) return;
    const picking = !splitSession.picking;
    setSplitSession({ ...splitSession, picking });
    setNotice(t(picking ? "status.splitPick" : "status.splitReady"));
  }, [splitSession]);

  // The plane lies down on the face that was clicked: its turn, through the clicked point.
  const pickSplitSurface = useCallback((point: [number, number, number], normal: [number, number, number]) => {
    const orientation = splitOrientationForNormal(normal);
    if (!orientation) return;
    setSplitSession((current) => {
      if (!current || current.busy || !current.picking) return current;
      const centeredPlane = modelSplitPlane(splitTargetPoints, orientation.axis, undefined, orientation.rotation);
      if (!centeredPlane) return current;
      const picked = centeredPlane.normal[0] * point[0] + centeredPlane.normal[1] * point[1] + centeredPlane.normal[2] * point[2];
      const position = snapSplitPositionToVertices(splitTargetPoints, centeredPlane.normal, picked);
      const plane = modelSplitPlane(splitTargetPoints, orientation.axis, position, orientation.rotation);
      return plane ? { ...current, axis: plane.axis, rotation: plane.rotation, position: plane.position, pivot: plane.origin, picking: false, error: null } : current;
    });
    setNotice(t("status.splitReady"));
  }, [splitTargetPoints]);

  const changeSplitRotation = useCallback((index: 0 | 1, rotation: number) => {
    const angle = Math.max(-180, Math.min(180, rotation));
    setSplitSession((current) => {
      if (!current || current.busy) return current;
      const nextRotation: SplitRotation = index === 0 ? [angle, current.rotation[1]] : [current.rotation[0], angle];
      const centeredPlane = modelSplitPlane(splitTargetPoints, current.axis, undefined, nextRotation);
      if (!centeredPlane) return current;
      const position = centeredPlane.normal[0] * current.pivot[0]
        + centeredPlane.normal[1] * current.pivot[1]
        + centeredPlane.normal[2] * current.pivot[2];
      const plane = modelSplitPlane(splitTargetPoints, current.axis, position, nextRotation);
      return plane ? { ...current, rotation: nextRotation, position: plane.position, error: null } : current;
    });
  }, [splitTargetPoints]);

  const applySplit = useCallback(async () => {
    const session = splitSession;
    const plane = splitPlane;
    if (!session || !plane || session.busy) return;
    const sourceProjectId = splitProjectIdRef.current;
    const sourceContextIsCurrent = () => {
      const currentSelection = selectedIdsRef.current;
      return splitProjectIdRef.current === sourceProjectId
        && currentSelection.length === session.targetIds.length
        && session.targetIds.every((id) => currentSelection.includes(id))
        && projectShapesFingerprint(shapesRef.current) === session.sourceFingerprint;
    };
    if (!sourceContextIsCurrent()) {
      splitRunRef.current += 1;
      setSplitSession(null);
      setNotice(t("status.splitCancelledChanged"));
      return;
    }

    const runId = splitRunRef.current + 1;
    splitRunRef.current = runId;
    setSplitSession({ ...session, busy: true, error: null, picking: false });
    const outcome = await splitShapesByPlane(splitTargetShapes, plane, () => splitRunRef.current === runId && sourceContextIsCurrent());
    if (splitRunRef.current !== runId) return;
    if (outcome.status === "stale" || !sourceContextIsCurrent()) {
      splitRunRef.current += 1;
      setSplitSession(null);
      setNotice(t("status.splitCancelledProcessing"));
      return;
    }
    if (outcome.status === "failed") {
      const { shape, error } = outcome;
      setSplitSession((current) => current ? {
        ...current,
        busy: false,
        error: t("split.error.failed", { name: shape.name, detail: error }),
      } : current);
      setNotice(t("status.splitFailed", { name: shape.name }));
      return;
    }
    const { replacements, splitCount } = outcome;
    if (splitCount === 0) {
      setSplitSession((current) => current ? { ...current, busy: false, error: t("split.error.movePlane") } : current);
      setNotice(t("status.splitMissed"));
      return;
    }

    const nextShapes = shapesRef.current.flatMap((shape) => replacements.get(shape.id) ?? [shape]);
    const nextSelection = [...replacements.values()].flat().map((shape) => shape.id);
    setSplitSession(null);
    commitShapes(
      nextShapes,
      nextSelection,
      splitCount === 1
        ? t("status.splitOne", { count: nextSelection.length })
        : t("status.splitMany", { count: splitCount, bodies: nextSelection.length }),
    );
  }, [commitShapes, splitPlane, splitSession, splitTargetShapes]);

  useEffect(() => {
    if (!splitSession) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (splitSession.picking) {
          setSplitSession((current) => current ? { ...current, picking: false } : current);
          setNotice(t("status.splitReady"));
        } else {
          cancelSplit();
        }
        return;
      }
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (event.key === "Enter" && !target?.closest("input, select, textarea, button, [contenteditable='true']")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        void applySplit();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [applySplit, cancelSplit, splitSession]);

  const postCadModifierRequest = useCallback((request: CadModifierWorkerPayload, transfer: Transferable[] = []) => {
    const worker = cadModifierWorkerRef.current ?? cadModifierWorkerRestartRef.current();
    if (!worker) return null;
    const requestId = cadModifierRequestRef.current + 1;
    cadModifierRequestRef.current = requestId;
    try {
      worker.postMessage({ ...request, requestId } as CadModifierWorkerRequest, transfer);
    } catch {
      worker.terminate();
      if (cadModifierWorkerRef.current === worker) cadModifierWorkerRef.current = null;
      return null;
    }
    return requestId;
  }, []);

  const postCadModifierRequestAsync = useCallback((request: CadModifierWorkerPayload, transfer: Transferable[] = [], timeoutMs = 20000) => {
    const worker = cadModifierWorkerRef.current ?? cadModifierWorkerRestartRef.current();
    if (!worker) {
      return Promise.reject(new Error("The CAD worker is not ready"));
    }
    const requestId = cadModifierRequestRef.current + 1;
    cadModifierRequestRef.current = requestId;
    return new Promise<CadModifierWorkerResponse>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        if (!cadModifierPendingRef.current.has(requestId)) return;
        const pendingRequests = [...cadModifierPendingRef.current.values()];
        cadModifierPendingRef.current.clear();
        pendingRequests.forEach((pending) => window.clearTimeout(pending.timer));
        cadModifierWorkerRef.current?.terminate();
        cadModifierWorkerRef.current = null;
        cadPreviewQueueRef.current.reset();
        const invalidationId = cadModifierRequestRef.current + 1;
        cadModifierRequestRef.current = invalidationId;
        cadModifierLatestPreviewRef.current = invalidationId;
        cadModifierPrepareRef.current = invalidationId;
        cadModifierBaseShapeRef.current = null;
        cadModifierBaseFingerprintRef.current = "";
        cadModifierSourcePartsRef.current = [];
        setEdgeModifier(null);
        cadModifierWorkerRestartRef.current();
        pendingRequests.forEach((pending) => pending.reject(new Error("Timed out waiting for the CAD worker; the worker was restarted")));
      }, timeoutMs);
      cadModifierPendingRef.current.set(requestId, { resolve, reject, timer });
      try {
        worker.postMessage({ ...request, requestId } as CadModifierWorkerRequest, transfer);
      } catch (error) {
        window.clearTimeout(timer);
        cadModifierPendingRef.current.delete(requestId);
        reject(error instanceof Error ? error : new Error("The CAD worker rejected the request"));
      }
    });
  }, []);

  const cancelEdgeModifier = useCallback(() => {
    invalidateCadModifierSession();
    setNotice(t("status.edgeCancelled"));
  }, [invalidateCadModifierSession]);

  const startEdgeModifier = useCallback((kind: CadModifierKind) => {
    setShellTool(null);
    if (selectedShapes.length !== 1 || !selectedShape || selectedShape.locked || selectedShape.hole || isNonSolidShapeKind(selectedShape.kind)) {
      setNotice(t("status.selectOneUnlocked", { kind }));
      return;
    }
    if (selectedShape.groupOperation === "bundle") {
      setNotice(t("status.bundleNotOneBody"));
      return;
    }
    invalidateCadModifierSession();
    stopCruise();
    const appliedEdgeTreatmentCount = edgeTreatmentFeatureCount(selectedShape);
    const hasAppliedEdgeTreatment = Boolean(selectedShape.importedMesh && selectedShape.edgeTreatments?.length);
    const sourceParts = (selectedShape.groupedShapes?.length && !hasAppliedEdgeTreatment && !shapeHasShapeDeform(selectedShape)
      ? restoreGroupedChildren(selectedShape)
      : [selectedShape]).flatMap(cadModifierSourceParts);
    const partInputs: Array<{ shape: WorkplaneShape; mesh?: MeshData; brep?: string; step?: string; thread?: CadModifierThreadPart; spring?: CadModifierSpringPart; helicalGear?: CadModifierHelicalGearPart; brepTransform?: number[]; primitive?: CadModifierPrimitivePart; profile?: CadModifierProfilePart; profileMesh?: MeshData }> = withinExactProfileLimit(sourceParts.map((shape) => {
      const frame = shape.cadBrepFrame;
      const preserveNeedsRetessellation = preservesEdgeTreatmentSize(shape) && Boolean(frame) && (
        Math.abs(shapeWidth(shape) - (frame?.width ?? shapeWidth(shape))) > 1e-6 ||
        Math.abs(shapeDepth(shape) - (frame?.depth ?? shapeDepth(shape))) > 1e-6 ||
        Math.abs(shape.height - (frame?.height ?? shape.height)) > 1e-6
      );
      if (shapeHasShapeDeform(shape)) {
        // A tapered or leaning prism is a ruled loft between its ends; anything else deformed keeps its mesh.
        const lofted = cadModifierProfileForShape(shape);
        return lofted ? { shape, profile: lofted, profileMesh: meshForShape(shape) } : { shape, mesh: meshForShape(shape) };
      }
      const primitive = cadModifierPrimitiveForShape(shape);
      if (primitive) return { shape, primitive };
      const profile = cadModifierProfileForShape(shape) ?? textGlyphProfileByPart.get(shape);
      if (profile) return { shape, profile, profileMesh: meshForShape(shape) };
      // A thread is built exactly from its own measures; the display mesh only checks it, and stands in if it fails.
      const exactThread = cadModifierThreadForShape(shape);
      if (exactThread) return { shape, thread: exactThread, profileMesh: meshForShape(shape) };
      // A spring likewise.
      const exactSpring = cadModifierSpringForShape(shape);
      if (exactSpring) return { shape, spring: exactSpring, profileMesh: meshForShape(shape) };
      // A helical gear likewise.
      const exactHelicalGear = cadModifierHelicalGearForShape(shape);
      if (exactHelicalGear) return { shape, helicalGear: exactHelicalGear, profileMesh: meshForShape(shape) };
      // A STEP import brought its exact body along; the display mesh only checks it, and stands in if it fails.
      const importedStep = importedStepPartForShape(shape);
      if (importedStep) return { shape, ...importedStep, profileMesh: meshForShape(shape) };
      return shape.cadBrep && frame && !preserveNeedsRetessellation
        ? { shape, brep: shape.cadBrep, brepTransform: cadBrepTransformForShape(shape) }
        : { shape, mesh: meshForShape(shape) };
    }));
    const triangleCount = partInputs.reduce((total, part) => total + (part.mesh?.faces.length ?? 0), 0);
    const profileTriangleCount = partInputs.reduce((total, part) => total + (part.profileMesh?.faces.length ?? 0), 0);
    const profilePartCount = partInputs.filter((part) => part.profile || part.step || part.thread || part.spring || part.helicalGear).length;
    const profileSegmentCount = partInputs.reduce((total, part) => total + (part.profile ? cadProfileSegmentCount(part.profile) : 0), 0);
    const sendProfileMeshes = triangleCount + profileTriangleCount <= CAD_MODIFIER_PREPARE_TRIANGLE_LIMIT;
    // A STEP import's, a thread's, a spring's or a helical gear's mesh went
    // along as the part itself until it had its own body; it still goes along
    // whenever it would have fitted then.
    const stepTriangleCount = partInputs.reduce((total, part) => total + (part.step || part.thread || part.spring || part.helicalGear ? part.profileMesh?.faces.length ?? 0 : 0), 0);
    const sendStepMeshes = sendProfileMeshes || triangleCount + stepTriangleCount <= CAD_MODIFIER_PREPARE_TRIANGLE_LIMIT;
    const prepareTimeoutMs = cadModifierPrepareTimeoutMs(triangleCount + (sendProfileMeshes ? profileTriangleCount : sendStepMeshes ? stepTriangleCount : 0), profilePartCount, profileSegmentCount);
    if (triangleCount === 0 && partInputs.every((part) => !part.brep && !part.step && !part.thread && !part.spring && !part.helicalGear && !part.primitive && !part.profile)) {
      setNotice(t("status.noPrintableSurface"));
      return;
    }
    if (triangleCount > CAD_MODIFIER_PREPARE_TRIANGLE_LIMIT) {
      // Ein Gewinde kommt nur noch als Dreiecke hier an, wenn es keinen
      // exakten Koerper bekommt; dann besteht die Wendel aus tausenden
      // Dreiecken, und die Absage nennt gleich den Weg, der wirklich zum
      // gebrochenen Schraubenkopf fuehrt. Ein exakt gebautes Gewinde zaehlt
      // hier nicht mit, die Absage gilt dann einem anderen Teil.
      const istGewinde = partInputs.some((part) => part.mesh && part.shape.kind === "thread");
      setNotice(t(istGewinde ? "status.threadTooDense" : "status.meshTooDense", {
        triangles: formatTriangleCount(triangleCount),
        limit: formatTriangleCount(CAD_MODIFIER_PREPARE_TRIANGLE_LIMIT),
      }), true);
      return;
    }
    const amount = Math.max(MIN_EDGE_MODIFIER_AMOUNT, Math.min(1, shapeWidth(selectedShape) / 6, shapeDepth(selectedShape) / 6, selectedShape.height / 6));
    cadModifierBaseShapeRef.current = selectedShape;
    cadModifierBaseFingerprintRef.current = projectShapesFingerprint([selectedShape]);
    cadModifierSourcePartsRef.current = sourceParts;
    setAlignMode(false);
    setMirrorMode(false);
    splitRunRef.current += 1;
    setSplitSession(null);
    setEdgeModifier({
      kind,
      edges: [],
      selectedEdgeIds: [],
      amount,
      sharpAngle: 25,
      chamferAngle: 45,
      quality: "standard",
      tangentChain: defaultCadModifierTangentChain(appliedEdgeTreatmentCount),
      preserveEdgeSize: selectedShape.edgeResizeMode === "preserve",
      busy: true,
      prepared: false,
      error: null,
      preview: null,
      componentPreviews: [],
    });
    setNotice(t("status.preparingEdges", { kind }), true);
    const parts: CadModifierMeshPart[] = partInputs.map((part) => {
      if (part.brep) return { brep: part.brep, brepTransform: part.brepTransform, hole: Boolean(part.shape.hole) };
      if (part.thread) return cadModifierThreadMeshPart(part.thread, part.profileMesh, sendStepMeshes, Boolean(part.shape.hole));
      if (part.spring) return cadModifierSpringMeshPart(part.spring, part.profileMesh, sendStepMeshes, Boolean(part.shape.hole));
      if (part.helicalGear) return cadModifierHelicalGearMeshPart(part.helicalGear, part.profileMesh, sendStepMeshes, Boolean(part.shape.hole));
      if (part.step) return cadModifierImportedStepMeshPart(part.step, part.brepTransform, part.profileMesh, sendStepMeshes, Boolean(part.shape.hole));
      if (part.primitive) return { primitive: part.primitive, hole: Boolean(part.shape.hole) };
      if (part.profile) return cadModifierProfileMeshPart(part.profile, part.profileMesh, sendProfileMeshes, Boolean(part.shape.hole));
      return { ...meshDataToCadTransfer(part.mesh as MeshData), hole: Boolean(part.shape.hole) };
    });
    const prepareRequestId = postCadModifierRequest({
      type: "prepare",
      parts,
      sharpAngle: 25,
      suppressTreatmentDetailEdges: appliedEdgeTreatmentCount > 0,
    }, parts.flatMap((part) => part.positions && part.indices ? [part.positions.buffer, part.indices.buffer] : []));
    if (prepareRequestId === null) {
      const message = cadModifierWorkerFailureMessage();
      setEdgeModifier((current) => current ? { ...current, busy: false, prepared: false, error: message } : current);
      setNotice(message);
      return;
    }
    cadModifierPrepareRef.current = prepareRequestId;
    armCadModifierWatchdog(prepareRequestId, "prepare", prepareTimeoutMs);
  }, [armCadModifierWatchdog, invalidateCadModifierSession, postCadModifierRequest, selectedShape, selectedShapes.length, stopCruise]);

  const prepareCadModifierForMcp = useCallback(async (shape: WorkplaneShape, sharpAngle: number) => {
    if (shape.locked || shape.hole) {
      throw new Error("Select one unlocked solid object for edge treatment");
    }
    if (shape.groupOperation === "bundle") {
      throw new Error("A bundle is not one body; group it (layerling_group_objects) or treat its parts one by one");
    }
    const appliedEdgeTreatmentCount = edgeTreatmentFeatureCount(shape);
    const hasAppliedEdgeTreatment = Boolean(shape.importedMesh && shape.edgeTreatments?.length);
    const sourceParts = (shape.groupedShapes?.length && !hasAppliedEdgeTreatment && !shapeHasShapeDeform(shape)
      ? restoreGroupedChildren(shape)
      : [shape]).flatMap(cadModifierSourceParts);
    const partInputs: Array<{ shape: WorkplaneShape; mesh?: MeshData; brep?: string; step?: string; thread?: CadModifierThreadPart; spring?: CadModifierSpringPart; helicalGear?: CadModifierHelicalGearPart; brepTransform?: number[]; primitive?: CadModifierPrimitivePart; profile?: CadModifierProfilePart; profileMesh?: MeshData }> = withinExactProfileLimit(sourceParts.map((partShape) => {
      const frame = partShape.cadBrepFrame;
      const preserveNeedsRetessellation = preservesEdgeTreatmentSize(partShape) && Boolean(frame) && (
        Math.abs(shapeWidth(partShape) - (frame?.width ?? shapeWidth(partShape))) > 1e-6 ||
        Math.abs(shapeDepth(partShape) - (frame?.depth ?? shapeDepth(partShape))) > 1e-6 ||
        Math.abs(partShape.height - (frame?.height ?? partShape.height)) > 1e-6
      );
      if (shapeHasShapeDeform(partShape)) {
        // A tapered or leaning prism is a ruled loft between its ends; anything else deformed keeps its mesh.
        const lofted = cadModifierProfileForShape(partShape);
        return lofted ? { shape: partShape, profile: lofted, profileMesh: meshForShape(partShape) } : { shape: partShape, mesh: meshForShape(partShape) };
      }
      const primitive = cadModifierPrimitiveForShape(partShape);
      if (primitive) return { shape: partShape, primitive };
      const profile = cadModifierProfileForShape(partShape) ?? textGlyphProfileByPart.get(partShape);
      if (profile) return { shape: partShape, profile, profileMesh: meshForShape(partShape) };
      // A thread is built exactly from its own measures; the display mesh only checks it, and stands in if it fails.
      const exactThread = cadModifierThreadForShape(partShape);
      if (exactThread) return { shape: partShape, thread: exactThread, profileMesh: meshForShape(partShape) };
      // A spring likewise.
      const exactSpring = cadModifierSpringForShape(partShape);
      if (exactSpring) return { shape: partShape, spring: exactSpring, profileMesh: meshForShape(partShape) };
      // A helical gear likewise.
      const exactHelicalGear = cadModifierHelicalGearForShape(partShape);
      if (exactHelicalGear) return { shape: partShape, helicalGear: exactHelicalGear, profileMesh: meshForShape(partShape) };
      // A STEP import brought its exact body along; the display mesh only checks it, and stands in if it fails.
      const importedStep = importedStepPartForShape(partShape);
      if (importedStep) return { shape: partShape, ...importedStep, profileMesh: meshForShape(partShape) };
      return partShape.cadBrep && frame && !preserveNeedsRetessellation
        ? { shape: partShape, brep: partShape.cadBrep, brepTransform: cadBrepTransformForShape(partShape) }
        : { shape: partShape, mesh: meshForShape(partShape) };
    }));
    const triangleCount = partInputs.reduce((total, part) => total + (part.mesh?.faces.length ?? 0), 0);
    const profileTriangleCount = partInputs.reduce((total, part) => total + (part.profileMesh?.faces.length ?? 0), 0);
    const profilePartCount = partInputs.filter((part) => part.profile || part.step || part.thread || part.spring || part.helicalGear).length;
    const profileSegmentCount = partInputs.reduce((total, part) => total + (part.profile ? cadProfileSegmentCount(part.profile) : 0), 0);
    const sendProfileMeshes = triangleCount + profileTriangleCount <= CAD_MODIFIER_PREPARE_TRIANGLE_LIMIT;
    // A STEP import's, a thread's, a spring's or a helical gear's mesh went
    // along as the part itself until it had its own body; it still goes along
    // whenever it would have fitted then.
    const stepTriangleCount = partInputs.reduce((total, part) => total + (part.step || part.thread || part.spring || part.helicalGear ? part.profileMesh?.faces.length ?? 0 : 0), 0);
    const sendStepMeshes = sendProfileMeshes || triangleCount + stepTriangleCount <= CAD_MODIFIER_PREPARE_TRIANGLE_LIMIT;
    const prepareTimeoutMs = cadModifierPrepareTimeoutMs(triangleCount + (sendProfileMeshes ? profileTriangleCount : sendStepMeshes ? stepTriangleCount : 0), profilePartCount, profileSegmentCount);
    if (triangleCount === 0 && partInputs.every((part) => !part.brep && !part.step && !part.thread && !part.spring && !part.helicalGear && !part.primitive && !part.profile)) {
      throw new Error("The selected object has no printable surface");
    }
    // A body revolved before the exact revolve is a mesh; hollowing or rounding it fails in confusing ways.
    if (partInputs.some((part) => !part.brep && part.shape.sketchOperation === "revolve" && part.shape.sketchProfile)) {
      throw new Error("This revolved body is a mesh from an older layerling; open Edit sketch and finish it again to make it exact");
    }
    if (triangleCount > CAD_MODIFIER_PREPARE_TRIANGLE_LIMIT) {
      throw new Error(`This mesh has ${triangleCount} triangles; interactive edge treatment stops at ${CAD_MODIFIER_PREPARE_TRIANGLE_LIMIT}. For a shape from the catalogue, use its own parameters for now. For an imported part, import it as STEP or with fewer triangles.`);
    }
    const parts: CadModifierMeshPart[] = partInputs.map((part) => {
      if (part.brep) return { brep: part.brep, brepTransform: part.brepTransform, hole: Boolean(part.shape.hole) };
      if (part.thread) return cadModifierThreadMeshPart(part.thread, part.profileMesh, sendStepMeshes, Boolean(part.shape.hole));
      if (part.spring) return cadModifierSpringMeshPart(part.spring, part.profileMesh, sendStepMeshes, Boolean(part.shape.hole));
      if (part.helicalGear) return cadModifierHelicalGearMeshPart(part.helicalGear, part.profileMesh, sendStepMeshes, Boolean(part.shape.hole));
      if (part.step) return cadModifierImportedStepMeshPart(part.step, part.brepTransform, part.profileMesh, sendStepMeshes, Boolean(part.shape.hole));
      if (part.primitive) return { primitive: part.primitive, hole: Boolean(part.shape.hole) };
      if (part.profile) return cadModifierProfileMeshPart(part.profile, part.profileMesh, sendProfileMeshes, Boolean(part.shape.hole));
      return { ...meshDataToCadTransfer(part.mesh as MeshData), hole: Boolean(part.shape.hole) };
    });
    const transfer = parts.flatMap((part) => part.positions && part.indices ? [part.positions.buffer as Transferable, part.indices.buffer as Transferable] : []);
    const response = await postCadModifierRequestAsync({
      type: "prepare",
      parts,
      sharpAngle,
      suppressTreatmentDetailEdges: appliedEdgeTreatmentCount > 0,
    }, transfer, prepareTimeoutMs);
    if (response.type !== "ready") {
      throw new Error("The CAD worker did not return an edge list");
    }
    return { response, sourceParts };
  }, [postCadModifierRequestAsync]);

  const applyCadModifierForMcp = useCallback(async (
    shape: WorkplaneShape,
    params: Record<string, unknown>,
  ) => {
    invalidateCadModifierSession();
    const sourceFingerprint = projectShapesFingerprint([shape]);
    const sourceProjectId = projectInfoRef.current.projectId;
    const kind: CadModifierKind = params.kind === "fillet" ? "fillet" : "chamfer";
    const sharpAngle = Math.max(1, Math.min(CAD_MODIFIER_MAX_SHARP_ANGLE, mcpNumber(params.sharpAngle, 25)));
    const amount = Math.max(MIN_EDGE_MODIFIER_AMOUNT, mcpNumber(params.amount, 1));
    const chamferAngle = Math.max(5, Math.min(85, mcpNumber(params.chamferAngle, 45)));
    const quality: CadModifierQuality = params.quality === "draft" || params.quality === "fine" ? params.quality : "standard";
    const preserveEdgeSize = typeof params.preserveEdgeSize === "boolean" ? params.preserveEdgeSize : shape.edgeResizeMode === "preserve";
    const { response, sourceParts } = await prepareCadModifierForMcp(shape, sharpAngle);
    const selectableIds = response.edges.filter((edge) => selectableCadModifierEdge(edge, sharpAngle)).map((edge) => edge.id);
    const requestedIds = mcpNumberArray(params.edgeIds);
    const selectedEdgeIds = params.edgeIds === "all" || params.allEdges === true
      ? selectableIds
      : params.edgeIds === "top"
        // The rim along the very top, as the panel's "Top edges" picks it (#154).
        ? topCadModifierEdgeIds(response.edges, selectableIds)
        : requestedIds.filter((edgeId) => selectableIds.includes(edgeId));
    const missingIds = requestedIds.filter((edgeId) => !selectableIds.includes(edgeId));
    if (selectedEdgeIds.length === 0) {
      throw new Error("Select at least one valid highlighted edge ID");
    }
    if (missingIds.length > 0) {
      throw new Error(`These edge IDs are not selectable at the current threshold: ${missingIds.join(", ")}`);
    }
    const previewResponse = await postCadModifierRequestAsync({
      type: "preview",
      kind,
      edgeIds: selectedEdgeIds,
      amount,
      quality,
      chamferAngle,
      minDeflection: shape.cadMeshDeflection,
    }, [], 30000);
    if (previewResponse.type !== "preview") {
      throw new Error("The CAD worker did not return an edge preview");
    }
    const rawPreview = shapeFromCadMesh(shape, previewResponse.positions, previewResponse.normals, previewResponse.indices, previewResponse.brep, previewResponse.deflection);
    if (!rawPreview) {
      throw new Error("The CAD kernel returned an empty edge treatment");
    }
    const preview = canonicalizeShape({
      ...rawPreview,
      cadDisplayEdges: cadDisplayEdgesForShape(rawPreview, previewResponse.displayEdges),
      cadDisplayEdgesVersion: 2 as const,
    });
    const feature = {
      kind,
      amount,
      edgeCount: selectedEdgeIds.length,
      ...(kind === "chamfer" ? { chamferAngle } : {}),
    } satisfies NonNullable<WorkplaneShape["edgeTreatments"]>[number];
    const session: EdgeModifierSession = {
      kind,
      edges: response.edges,
      selectedEdgeIds,
      amount,
      sharpAngle,
      chamferAngle,
      quality,
      tangentChain: false,
      preserveEdgeSize,
      busy: false,
      prepared: true,
      error: null,
      preview,
      componentPreviews: cadModifierComponentPreviews(sourceParts, previewResponse.components, previewResponse.deflection),
    };
    const createdAt = Date.now();
    const groupedModifiedShape = groupedShapeWithComponentEdgeTreatment(shape, preview, sourceParts, session, feature, createdAt);
    const modifiedShape = groupedModifiedShape ?? shapeWithEdgeTreatmentRecord(
      bakedEdgeTreatmentPreview(preview, shape),
      shape,
      feature,
      preserveEdgeSize,
      createdAt,
    );
    const currentTarget = shapesRef.current.find((candidate) => candidate.id === shape.id);
    if (
      projectInfoRef.current.projectId !== sourceProjectId ||
      !currentTarget ||
      projectShapesFingerprint([currentTarget]) !== sourceFingerprint
    ) {
      throw new Error("The target object or project changed while the edge treatment was running; try again");
    }
    commitShapes(
      shapesRef.current.map((candidate) => candidate.id === shape.id ? modifiedShape : candidate),
      modifiedShape.id,
      selectedEdgeIds.length === 1
        ? t(kind === "fillet" ? "status.filletedMcpOne" : "status.chamferedMcpOne")
        : t(kind === "fillet" ? "status.filletedMcpMany" : "status.chamferedMcpMany", { count: selectedEdgeIds.length }),
    );
    return {
      object: mcpShapeSummary(modifiedShape),
      selectedEdgeIds,
      selectableEdgeIds: selectableIds,
    };
  }, [commitShapes, invalidateCadModifierSession, prepareCadModifierForMcp, postCadModifierRequestAsync]);

  /*
   * Aushoehlen laeuft ueber denselben Weg wie Fase und Rundung: der Koerper
   * geht als CAD-Teile an den Arbeiter, zurueck kommt ein exakter Koerper samt
   * BREP, und der Eintrag im Verlauf haelt den Zustand davor fest - so laesst
   * sich die Aushoehlung spaeter wieder entfernen wie jede Kantenbehandlung.
   * "Groesse beibehalten" ist fest an: die Wandstaerke soll beim Skalieren
   * bleiben, was sie ist.
   */
  // `watched` is the body in the scene the result replaces; it is the shape
  // itself, except when a resized hollow body is hollowed again from its state before.
  const shellShape = useCallback(async (shape: WorkplaneShape, thickness: number, openings: ShellOpenings, edges: ShellEdges = "round", watched: WorkplaneShape = shape) => {
    if (shape.locked || shape.hole || isNonSolidShapeKind(shape.kind)) {
      throw new Error("Select one unlocked solid object to hollow");
    }
    invalidateCadModifierSession();
    const sourceFingerprint = projectShapesFingerprint([watched]);
    const sourceProjectId = projectInfoRef.current.projectId;
    const { response, sourceParts } = await prepareCadModifierForMcp(shape, 25);
    const previewResponse = await postCadModifierRequestAsync({
      type: "preview",
      kind: "shell",
      edgeIds: [],
      amount: thickness,
      quality: "standard",
      chamferAngle: 45,
      shellOpenings: openings,
      shellEdges: edges,
      minDeflection: shape.cadMeshDeflection,
    }, [], 60000);
    if (previewResponse.type !== "preview") {
      throw new Error("The CAD worker did not return a hollowed body");
    }
    const rawPreview = shapeFromCadMesh(shape, previewResponse.positions, previewResponse.normals, previewResponse.indices, previewResponse.brep, previewResponse.deflection);
    if (!rawPreview) {
      throw new Error("The CAD kernel returned an empty body");
    }
    const preview = canonicalizeShape({
      ...rawPreview,
      cadDisplayEdges: cadDisplayEdgesForShape(rawPreview, previewResponse.displayEdges),
      cadDisplayEdgesVersion: 2 as const,
    });
    const feature = { kind: "shell" as const, amount: thickness, edgeCount: 0, openings, ...(edges === "sharp" ? { shellEdges: edges } : {}) } satisfies NonNullable<WorkplaneShape["edgeTreatments"]>[number];
    const session: EdgeModifierSession = {
      kind: "shell",
      edges: response.edges,
      selectedEdgeIds: [],
      amount: thickness,
      sharpAngle: 25,
      chamferAngle: 45,
      quality: "standard",
      tangentChain: false,
      preserveEdgeSize: true,
      busy: false,
      prepared: true,
      error: null,
      preview,
      componentPreviews: cadModifierComponentPreviews(sourceParts, previewResponse.components, previewResponse.deflection),
    };
    const createdAt = Date.now();
    const modifiedShape = groupedShapeWithComponentEdgeTreatment(shape, preview, sourceParts, session, feature, createdAt)
      ?? shapeWithEdgeTreatmentRecord(bakedEdgeTreatmentPreview(preview, shape), shape, feature, true, createdAt);
    const currentTarget = shapesRef.current.find((candidate) => candidate.id === watched.id);
    if (
      projectInfoRef.current.projectId !== sourceProjectId ||
      !currentTarget ||
      projectShapesFingerprint([currentTarget]) !== sourceFingerprint
    ) {
      throw new Error("The object or project changed while it was being hollowed; try again");
    }
    return modifiedShape;
  }, [invalidateCadModifierSession, prepareCadModifierForMcp, postCadModifierRequestAsync]);

  const startShellTool = useCallback(() => {
    if (shellTool) {
      setShellTool(null);
      return;
    }
    if (selectedShapes.length !== 1 || !selectedShape || selectedShape.locked || selectedShape.hole || isNonSolidShapeKind(selectedShape.kind)) {
      setNotice(t("status.selectOneUnlocked", { kind: t("editor.tool.hollow") }));
      return;
    }
    if (selectedShape.groupOperation === "bundle") {
      setNotice(t("status.bundleNotOneBody"));
      return;
    }
    if (edgeModifier) invalidateCadModifierSession();
    closeSplit();
    const smallest = Math.min(shapeWidth(selectedShape), shapeDepth(selectedShape), selectedShape.height);
    setShellTool({ thickness: Math.max(0.2, Math.min(2, Number((smallest / 5).toFixed(1)))), openings: "top", edges: "round", busy: false, error: null });
  }, [closeSplit, edgeModifier, invalidateCadModifierSession, selectedShape, selectedShapes.length, shellTool]);

  const applyShellTool = useCallback(() => {
    if (!shellTool || shellTool.busy) return;
    const target = selectedShape;
    if (!target || selectedShapes.length !== 1) {
      setShellTool(null);
      return;
    }
    const { thickness, openings, edges } = shellTool;
    setShellTool((current) => current ? { ...current, busy: true, error: null } : current);
    void shellShape(target, thickness, openings, edges)
      .then((modifiedShape) => {
        commitShapes(
          shapesRef.current.map((candidate) => candidate.id === target.id ? modifiedShape : candidate),
          modifiedShape.id,
          t("status.shelled", { size: Number(thickness.toFixed(2)) }),
        );
        setShellTool(null);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? localizedError(error.message) : String(error);
        setShellTool((current) => current ? { ...current, busy: false, error: message } : current);
      });
  }, [commitShapes, selectedShape, selectedShapes.length, shellShape, shellTool]);

  // The panel belongs to one selected body; a new selection closes it.
  useEffect(() => {
    setShellTool((current) => current && !current.busy ? null : current);
  }, [selectedShape?.id]);

  /*
   * Ein ausgehoehlter Koerper wird nach dem Groesse-Aendern neu ausgehoehlt:
   * aus seinem Zustand vor dem Aushoehlen, auf die neue Groesse gebracht. So
   * bleibt die Wand auch an runden Koerpern genau so dick wie gewaehlt. Das
   * Ergebnis ersetzt den Stand im Verlauf, statt einen eigenen Schritt
   * anzulegen - Rueckgaengig nimmt die Groessenaenderung als Ganzes zurueck.
   */
  /**
   * A body rebuilt in the background after a resize takes the place of the
   * stale one - in the scene and, while the history still shows the resize,
   * in that history entry, so one undo takes back the resize as a whole. If
   * the body changed meanwhile, nothing happens: the next round picks it up.
   */
  const replaceRebuiltShape = useCallback((staleId: string, fingerprint: string, rebuilt: WorkplaneShape) => {
    const current = shapesRef.current;
    if (!current.some((shape) => shape.id === staleId && projectShapesFingerprint([shape]) === fingerprint)) return false;
    const next = current.map((shape) => shape.id === staleId ? canonicalizeShape(rebuilt) : shape);
    const scene = editorHistoryEntry(current, selectedIdsRef.current, notesRef.current, placementWorkplaneRef.current);
    const entryNow = editorHistoryEntry(next, selectedIdsRef.current, notesRef.current, placementWorkplaneRef.current);
    const index = historyIndexRef.current;
    shapesRef.current = next;
    setShapes(next);
    if (historyRef.current[index]?.fingerprint === scene.fingerprint) {
      openGroupHistoryRef.current.set(entryNow.fingerprint, openGroupsRef.current);
      const entries = historyRef.current.map((candidate, candidateIndex) => candidateIndex === index ? entryNow : candidate);
      historyRef.current = entries;
      setHistory(entries);
    } else {
      appendHistoryEntry(entryNow);
    }
    syncProjectShapes(next);
    return true;
  }, [appendHistoryEntry, syncProjectShapes]);

  const shellRebuildBusyRef = useRef(false);
  const shellRebuildFailedRef = useRef(new Set<string>());
  const [shellRebuildRound, setShellRebuildRound] = useState(0);
  useEffect(() => {
    if (projectInteractionActive || edgeModifier || shellTool || shellRebuildBusyRef.current) return;
    const stale = shapes.find((shape) => !shape.locked && shellNeedingRebuild(shape) && !shellRebuildFailedRef.current.has(projectShapesFingerprint([shape])));
    if (!stale) return;
    const timer = window.setTimeout(() => {
      const entry = shellNeedingRebuild(stale);
      if (!entry) return;
      const fingerprint = projectShapesFingerprint([stale]);
      const { amount, openings, shellEdges } = entry.feature;
      const applied = entry.appliedFrame!;
      const width = entry.before.width * shapeWidth(stale) / Math.max(0.001, applied.width);
      const depth = entry.before.depth * shapeDepth(stale) / Math.max(0.001, applied.depth);
      // A cylinder stays round; stretched unevenly it becomes the ellipse it now is.
      const source = entry.before.kind === "cylinder" && Math.abs(width - depth) > 0.005
        ? { ...entry, before: { ...entry.before, kind: "ellipse" as const } }
        : entry;
      const before = restoreShapeBeforeEdgeTreatment(stale, source);
      if (Math.abs(shapeWidth(before) - width) > 0.05 || Math.abs(shapeDepth(before) - depth) > 0.05) {
        shellRebuildFailedRef.current.add(fingerprint);
        setNotice(t("status.shellRebuildFailed"), true);
        setShellRebuildRound((round) => round + 1);
        return;
      }
      shellRebuildBusyRef.current = true;
      void shellShape(before, amount, openings ?? "none", shellEdges ?? "round", stale)
        .then((rebuilt) => {
          if (replaceRebuiltShape(stale.id, fingerprint, rebuilt)) setNotice(t("status.shellRebuilt", { size: Number(amount.toFixed(2)) }));
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? localizedError(error.message) : String(error);
          // Changed in the meantime: the next round picks up the newer state.
          if (/changed while/.test(message)) return;
          shellRebuildFailedRef.current.add(fingerprint);
          setNotice(t("status.shellRebuildFailed"), true);
        })
        .finally(() => {
          shellRebuildBusyRef.current = false;
          setShellRebuildRound((round) => round + 1);
        });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [edgeModifier, projectInteractionActive, replaceRebuiltShape, shapes, shellRebuildRound, shellShape, shellTool]);

  /*
   * Ein Skizzenkoerper, dessen Groesse geaendert wurde, wird aus seiner Skizze
   * neu extrudiert - die Skizze auf die neue Groesse gestreckt. Sein gespeicherter
   * CAD-Koerper passte sonst nicht mehr, und ihn ungleich zu strecken liefert bei
   * Kurven einen ungueltigen Koerper: Fase und Rundung scheiterten (#115).
   */
  const sketchRebuildBusyRef = useRef(false);
  const sketchRebuildFailedRef = useRef(new Set<string>());
  const [sketchRebuildRound, setSketchRebuildRound] = useState(0);
  useEffect(() => {
    if (projectInteractionActive || edgeModifier || shellTool || sketchActive || sketchRebuildBusyRef.current) return;
    const stale = shapes.find((shape) => sketchBodyStretch(shape) && !sketchRebuildFailedRef.current.has(projectShapesFingerprint([shape])));
    if (!stale?.sketchProfile) return;
    const timer = window.setTimeout(() => {
      const stretch = sketchBodyStretch(stale);
      if (!stretch || !stale.sketchProfile) return;
      const fingerprint = projectShapesFingerprint([stale]);
      sketchRebuildBusyRef.current = true;
      void cadShapeFromSketchProfile(stretchedSketchProfile(stale.sketchProfile, stretch.x, stretch.z), stretch.height, stale)
        .then((extrusion) => {
          replaceRebuiltShape(stale.id, fingerprint, placeSketchShape(extrusion, placementWorkplaneRef.current, stale));
        })
        .catch(() => {
          sketchRebuildFailedRef.current.add(fingerprint);
          setNotice(t("status.sketchRebuildFailed"), true);
        })
        .finally(() => {
          sketchRebuildBusyRef.current = false;
          setSketchRebuildRound((round) => round + 1);
        });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [edgeModifier, projectInteractionActive, replaceRebuiltShape, shapes, shellTool, sketchActive, sketchRebuildRound]);

  useEffect(() => {
    const base = cadModifierBaseShapeRef.current;
    if (!edgeModifier || !base) return;
    const current = shapes.find((shape) => shape.id === base.id);
    if (current && projectShapesFingerprint([current]) === cadModifierBaseFingerprintRef.current) return;
    invalidateCadModifierSession();
    setNotice(t("status.edgeCancelledChanged"));
  }, [edgeModifier, invalidateCadModifierSession, shapes]);

  const applyEdgeModifier = useCallback(() => {
    const base = cadModifierBaseShapeRef.current;
    if (!edgeModifier?.preview || !base) {
      setNotice(t("status.waitForPreview"), true);
      return;
    }
    const feature = {
      kind: edgeModifier.kind,
      amount: edgeModifier.amount,
      edgeCount: edgeModifier.selectedEdgeIds.length,
      ...(edgeModifier.kind === "chamfer" ? { chamferAngle: edgeModifier.chamferAngle } : {}),
    } satisfies NonNullable<WorkplaneShape["edgeTreatments"]>[number];
    const createdAt = Date.now();
    const previewShape = canonicalizeShape({
      ...edgeModifier.preview,
      cadDisplayEdges: edgeModifier.preview.cadDisplayEdges?.length
        ? edgeModifier.preview.cadDisplayEdges
        : cadDisplayEdgesAfterTreatment(edgeModifier.preview, edgeModifier),
      cadDisplayEdgesVersion: 2,
    });
    const groupedModifiedShape = groupedShapeWithComponentEdgeTreatment(
      base,
      previewShape,
      cadModifierSourcePartsRef.current,
      edgeModifier,
      feature,
      createdAt,
    );
    const modifiedShape: WorkplaneShape = groupedModifiedShape ?? shapeWithEdgeTreatmentRecord(
      bakedEdgeTreatmentPreview(previewShape, base),
      base,
      feature,
      edgeModifier.preserveEdgeSize,
      createdAt,
    );
    commitShapes(
      shapes.map((shape) => shape.id === base.id ? modifiedShape : shape),
      base.id,
      edgeModifier.selectedEdgeIds.length === 1
        ? t(edgeModifier.kind === "fillet" ? "status.filletedOne" : "status.chamferedOne")
        : t(edgeModifier.kind === "fillet" ? "status.filletedMany" : "status.chamferedMany", {
            count: edgeModifier.selectedEdgeIds.length,
          }),
    );
    invalidateCadModifierSession();
  }, [commitShapes, edgeModifier, invalidateCadModifierSession, shapes]);

  useEffect(() => {
    if (!edgeModifier) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        cancelEdgeModifier();
      } else if (event.key === "Enter" && edgeModifier.preview && edgeModifier.selectedEdgeIds.length > 0 && !edgeModifier.busy && !edgeModifier.error) {
        const target = event.target instanceof HTMLElement ? event.target : null;
        if (target?.closest("input, select, textarea, button, [contenteditable='true']")) return;
        event.preventDefault();
        applyEdgeModifier();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [applyEdgeModifier, cancelEdgeModifier, edgeModifier]);

  /*
   * Die einzige Stelle, die eine Vorschau losschickt. Sie geht ueber die
   * Warteschlange, damit nie mehr als eine Rechnung unterwegs ist: der Arbeiter
   * arbeitet alles ab, was er bekommt, und auf einem langsamen Rechner wird aus
   * einem Zug am Schieberegler sonst eine Warteschlange von Minuten.
   */
  const sendCadPreview = useCallback((payload: CadPreviewPayload) => {
    const requestId = postCadModifierRequest(payload);
    if (requestId === null) {
      const message = cadModifierWorkerFailureMessage();
      setEdgeModifier((current) => current ? { ...current, busy: false, prepared: false, preview: null, error: message } : current);
      setNotice(message);
      return null;
    }
    cadModifierLatestPreviewRef.current = requestId;
    armCadModifierWatchdog(requestId, "preview");
    setEdgeModifier((current) => current ? { ...current, busy: true, error: null } : current);
    return requestId;
  }, [armCadModifierWatchdog, postCadModifierRequest]);

  useEffect(() => {
    cadPreviewSendRef.current = sendCadPreview;
  }, [sendCadPreview]);

  /** Wer die Auswahl leert, will, dass Schluss ist - auch mit dem, was schon laeuft. */
  const discardPendingCadPreviews = useCallback(() => {
    const queue = cadPreviewQueueRef.current;
    if (queue.inFlightId === null && queue.queuedPayload === null) return;
    queue.reset();
    clearCadModifierWatchdog();
    const requestId = cadModifierRequestRef.current + 1;
    cadModifierRequestRef.current = requestId;
    cadModifierLatestPreviewRef.current = requestId;
    setEdgeModifier((current) => current?.busy ? { ...current, busy: false } : current);
  }, [clearCadModifierWatchdog]);

  useEffect(() => {
    if (!edgeModifier?.prepared) return;
    if (edgeModifier.selectedEdgeIds.length === 0) {
      discardPendingCadPreviews();
      // Ein neuer Wert ohne markierte Kante hat nichts zu rechnen - sonst
      // bliebe der Kreis auf "Anwenden" fuer immer stehen.
      setEdgeModifier((current) => current?.busy && current.selectedEdgeIds.length === 0 ? { ...current, busy: false } : current);
      return;
    }
    const timer = window.setTimeout(() => {
      cadPreviewQueueRef.current.request({
        type: "preview",
        kind: edgeModifier.kind,
        edgeIds: edgeModifier.selectedEdgeIds,
        amount: edgeModifier.amount,
        quality: edgeModifier.quality,
        chamferAngle: edgeModifier.chamferAngle,
        minDeflection: cadModifierBaseShapeRef.current?.cadMeshDeflection,
      });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [discardPendingCadPreviews, edgeModifier?.amount, edgeModifier?.chamferAngle, edgeModifier?.kind, edgeModifier?.prepared, edgeModifier?.quality, edgeModifier?.selectedEdgeIds]);

  const snapSelected = useCallback(() => {
    if (!hasSelection) {
      setNotice(t("status.selectShapeFirst"));
      return;
    }
    const selected = new Set(selectedIds);
    const grid = visibleGridStep(workspaceSettings);
    commitShapes(
      shapes.map((shape) =>
        selected.has(shape.id) && !shape.locked
          ? snapShapeFootprintToVisibleGrid(shape, meshAabb(shape), workspaceSettings)
          : shape,
      ),
      selectedIds,
      selectedShapes.length === 1
        ? t("status.snappedOne", { grid })
        : t("status.snappedMany", { count: selectedShapes.length, grid }),
    );
  }, [commitShapes, hasSelection, selectedIds, selectedShapes.length, shapes, workspaceSettings]);

  const toggleHidden = useCallback(() => {
    if (!hasSelection) {
      setNotice(t("status.selectShapeFirst"));
      return;
    }
    const selected = new Set(selectedIds);
    const shouldHide = selectedShapes.some((shape) => !shape.hidden);
    commitShapes(
      shapes.map((shape) => (selected.has(shape.id) && !shape.locked ? { ...shape, hidden: shouldHide } : shape)),
      selectedIds,
      shouldHide ? t("status.selectionHidden") : t("status.selectionShown"),
    );
  }, [commitShapes, hasSelection, selectedIds, selectedShapes, shapes]);

  const showHidden = useCallback(() => {
    const hiddenCount = shapes.filter((shape) => shape.hidden).length;
    if (hiddenCount === 0) {
      setNotice(t("status.noHiddenShapes"));
      return;
    }
    commitShapes(
      shapes.map((shape) => ({ ...shape, hidden: false })),
      selectedIds,
      hiddenCount === 1 ? t("status.shownHiddenOne") : t("status.shownHiddenMany", { count: hiddenCount }),
    );
  }, [commitShapes, selectedIds, shapes]);

  const toggleLocked = useCallback(() => {
    if (!hasSelection) {
      setNotice(t("status.selectShapeFirst"));
      return;
    }
    const selected = new Set(selectedIds);
    const shouldLock = selectedShapes.some((shape) => !shape.locked);
    commitShapes(
      shapes.map((shape) => (selected.has(shape.id) ? { ...shape, locked: shouldLock } : shape)),
      selectedIds,
      shouldLock ? t("status.selectionLockedNow") : t("status.selectionUnlocked"),
    );
  }, [commitShapes, hasSelection, selectedIds, selectedShapes, shapes]);

  const toggleOutliner = useCallback(() => {
    setOutlinerOpen((open) => !open);
  }, []);

  const toggleShapeLockById = useCallback((id: string) => {
    const target = shapes.find((s) => s.id === id);
    if (!target) return;
    const nextLocked = !target.locked;
    const shapeLabel = displayShapeName(target);
    commitShapes(
      shapes.map((s) => (s.id === id ? { ...s, locked: nextLocked } : s)),
      selectedIds,
      nextLocked ? t("status.shapeLocked", { name: shapeLabel }) : t("status.shapeUnlocked", { name: shapeLabel }),
    );
  }, [commitShapes, selectedIds, shapes]);

  const toggleShapeHiddenById = useCallback((id: string) => {
    const target = shapes.find((s) => s.id === id);
    if (!target) return;
    const nextHidden = !target.hidden;
    const shapeLabel = displayShapeName(target);
    commitShapes(
      shapes.map((s) => (s.id === id ? { ...s, hidden: nextHidden } : s)),
      nextHidden ? selectedIds.filter((selId) => selId !== id) : selectedIds,
      nextHidden ? t("status.shapeHidden", { name: shapeLabel }) : t("status.shapeShown", { name: shapeLabel }),
    );
  }, [commitShapes, selectedIds, shapes]);

  const renameShapeById = useCallback((id: string, name: string) => {
    updateShape(id, { name });
  }, [updateShape]);

  const setSelectionHoleMode = useCallback(
    (hole: boolean) => {
      if (!hasSelection) {
        setNotice(t("status.selectShapeFirst"));
        return;
      }
      const selected = new Set(selectedIds);
      commitShapes(
        shapes.map((shape) =>
          selected.has(shape.id) && !shape.locked
            ? withHoleMode(shape, hole)
            : shape,
        ),
        selectedIds,
        hole ? t("status.selectionToHole") : t("status.selectionToSolid"),
      );
    },
    [commitShapes, hasSelection, selectedIds, shapes],
  );

  /** One colour for every selected part (#183); locked ones stay as they are, a group shows it whole. */
  const setSelectionColor = useCallback(
    (color: string) => {
      if (!hasSelection) {
        setNotice(t("status.selectShapeFirst"));
        return;
      }
      const selected = new Set(selectedIds);
      commitShapes(
        shapes.map((shape) => {
          if (!selected.has(shape.id) || shape.locked || isNonSolidShapeKind(shape.kind)) return shape;
          const solid = withHoleMode(shape, false, color);
          return canonicalizeShape({ ...solid, color, ...(canToggleGroupColors(solid) ? { multicolor: false } : {}) });
        }),
        selectedIds,
        t("status.selectionColored", { count: selected.size }),
      );
    },
    [commitShapes, hasSelection, selectedIds, shapes],
  );

  const cutSelected = useCallback(() => {
    if (!hasSelection) {
      setNotice(t("status.selectShapeFirst"));
      return;
    }
    const selected = new Set(selectedIds);
    const copiedAt = Date.now();
    clipboardCopiedAtRef.current = copiedAt;
    setClipboard(selectedShapes);
    writeSharedClipboard(selectedShapes, copiedAt);
    commitShapes(
      shapes.filter((shape) => !selected.has(shape.id)),
      [],
      selectedShapes.length === 1 ? t("status.cutOne") : t("status.cutMany", { count: selectedShapes.length }),
    );
  }, [commitShapes, hasSelection, selectedIds, selectedShapes, shapes]);

  const raiseSelected = useCallback(
    (delta: number) => {
      if (!hasSelection) {
        return;
      }
      const selected = new Set(selectedIds);
      const normal = placementWorkplane.normal;
      commitShapes(
        shapes.map((shape) =>
          selected.has(shape.id) && !shape.locked
            ? {
                ...shape,
                x: cleanNearZero(shape.x + normal.x * delta),
                z: cleanNearZero(shape.z + normal.z * delta),
                elevation: cleanNearZero((shape.elevation ?? 0) + normal.y * delta),
              }
            : shape,
        ),
        selectedIds,
        delta > 0 ? t("status.selectionRaised") : t("status.selectionLowered"),
      );
    },
    [commitShapes, hasSelection, placementWorkplane, selectedIds, shapes],
  );

  const dropSelectedToWorkplane = useCallback(() => {
    if (!hasSelection) {
      setNotice(t("status.selectShapeFirst"));
      return;
    }
    const selected = new Set(selectedIds);
    commitShapes(
      shapes.map((shape) => {
        if (!selected.has(shape.id) || shape.locked) return shape;
        const translation = translationToWorkplane(
          placementWorkplane,
          meshForShape(shape).vertices.map(([x, y, z]) => ({ x, y, z })),
        );
        return {
          ...shape,
          x: cleanNearZero(shape.x + translation.x),
          z: cleanNearZero(shape.z + translation.z),
          elevation: cleanNearZero((shape.elevation ?? 0) + translation.y),
        };
      }),
      selectedIds,
      t("status.droppedToWorkplane"),
    );
  }, [commitShapes, hasSelection, placementWorkplane, selectedIds, shapes]);

  // "Lay flat": click a face of the selection, the selection turns so that
  // face lies on the workplane, and drops onto it - one undo step.
  const toggleLayFlat = useCallback(() => {
    if (layFlatPickMode) {
      setLayFlatPickMode(false);
      setNotice(t("status.layFlatCancelled"));
      return;
    }
    if (!hasSelection) {
      setNotice(t("status.selectShapeFirst"));
      return;
    }
    setAlignMode(false);
    setMirrorMode(false);
    setPivotPickMode(false);
    setArrayTool(null);
    closeSplit();
    stopCruise();
    setLayFlatPickMode(true);
    setNotice(t("status.layFlatStart"));
  }, [closeSplit, hasSelection, layFlatPickMode, stopCruise]);

  const layFlatOnFace = useCallback((pick: LayFlatPick | null) => {
    setLayFlatPickMode(false);
    const selected = new Set(selectedIds);
    if (!pick || !selected.has(pick.shapeId)) {
      setNotice(t("status.layFlatMissed"));
      return;
    }
    const movable = selectedShapes.filter((shape) => !shape.locked);
    if (movable.length !== selectedShapes.length) {
      setNotice(t("status.selectionLocked"));
      return;
    }
    commitShapes(laidFlatShapes(shapes, movable, pick.normal, placementWorkplane), selectedIds, t("status.laidFlat"));
  }, [commitShapes, placementWorkplane, selectedIds, selectedShapes, shapes]);

  const toggleMateFaces = useCallback(() => {
    if (mateTool) {
      setMateTool(null);
      setNotice(t("status.mateCancelled"));
      return;
    }
    const source = selectedShapes.length === 1 ? selectedShapes[0] : null;
    if (!source) {
      setNotice(t("status.mateSelectOne"));
      return;
    }
    if (source.locked) {
      setNotice(t("status.selectionLocked"));
      return;
    }
    closeSplit();
    stopCruise();
    setPivotPickMode(false);
    setLayFlatPickMode(false);
    setMateTool({ sourceId: source.id, step: "source", source: null, target: null, mode: "against", gap: 0 });
    setNotice(t("status.mateStart"));
  }, [closeSplit, mateTool, selectedShapes, stopCruise]);

  const pickMateFace = useCallback((pick: LayFlatPick | null) => {
    if (!mateTool || mateTool.step === "ready") return;
    if (mateTool.step === "source") {
      if (!pick || pick.shapeId !== mateTool.sourceId) {
        setNotice(t("status.mateMissedSource"));
        return;
      }
      setMateTool({ ...mateTool, step: "target", source: pick });
      setNotice(t("status.mateTarget"));
      return;
    }
    if (!pick || pick.shapeId === mateTool.sourceId) {
      setNotice(t("status.mateMissedTarget"));
      return;
    }
    setMateTool({ ...mateTool, step: "ready", target: pick });
    setNotice(t("status.mateReady"));
  }, [mateTool]);

  const applyMateFaces = useCallback(() => {
    if (!mateTool?.source || !mateTool.target) return;
    const { source, target, mode, gap } = mateTool;
    setMateTool(null);
    commitShapes(matedShapes(shapes, source, target, mode, gap), [source.shapeId], t("status.mated"));
  }, [commitShapes, mateTool, shapes]);

  // The tool belongs to the body it was started for.
  useEffect(() => {
    if (mateTool && (selectedIds.length !== 1 || selectedIds[0] !== mateTool.sourceId)) setMateTool(null);
  }, [mateTool, selectedIds]);

  const centerSelectionOnWorkplane = useCallback(() => {
    if (!hasSelection) {
      setNotice(t("status.selectShapeFirst"));
      return;
    }
    const selected = new Set(selectedIds);
    // Locked objects stay where they are, so they must not widen the bounding box
    // either - otherwise the objects that do move end up off-center.
    const movable = shapes.filter((shape) => selected.has(shape.id) && !shape.locked);
    if (movable.length === 0) {
      setNotice(t("status.unlockBeforeCenter"));
      return;
    }
    const offset = workplaneCenteringOffset(boundsForShapes(movable));
    if (!offset) {
      setNotice(t("status.nothingMeasurable"));
      return;
    }
    const offsetX = cleanNearZero(offset.x);
    const offsetZ = cleanNearZero(offset.z);
    if (offsetX === 0 && offsetZ === 0) {
      setNotice(t("status.alreadyCentered"));
      return;
    }
    const movableIds = new Set(movable.map((shape) => shape.id));
    commitShapes(
      shapes.map((shape) => (movableIds.has(shape.id)
        ? { ...shape, x: cleanNearZero(shape.x + offsetX), z: cleanNearZero(shape.z + offsetZ) }
        : shape)),
      selectedIds,
      movable.length === 1 ? t("status.centeredOne") : t("status.centeredMany", { count: movable.length }),
    );
  }, [commitShapes, hasSelection, selectedIds, shapes]);

  const activateWorkplaneTool = useCallback(() => {
    stopCruise();
    setWorkplaneMode((active) => {
      const next = !active;
      // Der Hinweis gilt, solange das Werkzeug scharf ist - das Abbrechen ist
      // eine gewoehnliche Meldung und darf gleich wieder gehen.
      setNotice(next ? t("status.workplaneToolStart") : t("status.workplaneToolCancelled"), next);
      return next;
    });
  }, [stopCruise]);

  const setActivePlacementWorkplane = useCallback((next: PlacementWorkplane, source: "shape" | "base") => {
    const previous = placementWorkplaneRef.current;
    const normalizedNext = normalizePlacementWorkplane(next);
    placementWorkplaneRef.current = normalizedNext;
    setPlacementWorkplane(normalizedNext);
    const horizontalElevation = Math.abs(normalizedNext.normal.x) < 1e-6
      && Math.abs(normalizedNext.normal.y - 1) < 1e-6
      && Math.abs(normalizedNext.normal.z) < 1e-6
      ? normalizedNext.origin.y
      : 0;
    placementElevationRef.current = horizontalElevation;
    setPlacementElevation(horizontalElevation);
    if (placementWorkplaneFingerprint(normalizedNext) !== placementWorkplaneFingerprint(previous)) {
      appendHistoryEntry(editorHistoryEntry(shapesRef.current, selectedIdsRef.current, notesRef.current, normalizedNext));
      syncProjectShapes(shapesRef.current, true);
    }
    setNotice(source === "shape"
      ? t("status.workplaneFromFace")
      : placementWorkplaneIsBase(normalizedNext) ? t("status.workplaneReset") : t("status.workplaneUpdated"));
  }, [appendHistoryEntry, syncProjectShapes]);

  const setViewportPlacementWorkplane = useCallback((next: PlacementWorkplane, source: "shape" | "base") => {
    setActivePlacementWorkplane(next, source);
  }, [setActivePlacementWorkplane]);

  const closeViewportWorkplaneMode = useCallback((active: boolean) => {
    setWorkplaneMode(active);
  }, []);

  const groupSelected = useCallback(async () => {
    if (selectedShapes.length < 2) {
      setNotice(t("status.selectTwoToGroup"));
      return;
    }

    if (selectedShapes.some((shape) => shape.locked)) {
      setNotice(t("status.unlockBeforeGroup"));
      return;
    }

    if (selectedShapes.some((shape) => isNonSolidShapeKind(shape.kind))) {
      setNotice(t("status.rulerNotSolid"));
      return;
    }

    const sourceFingerprint = projectShapesFingerprint(shapesRef.current);
    const sourceProjectId = projectInfoRef.current.projectId;
    const result = await buildGroupedShapeFromSelection(selectedShapes, workspaceSettingsRef.current.booleanTriangleLimit);
    if (projectInfoRef.current.projectId !== sourceProjectId || projectShapesFingerprint(shapesRef.current) !== sourceFingerprint) {
      setNotice(t("status.groupChanged"));
      return;
    }
    const { group } = result;
    if (!group) {
      if (result.consumed) {
        const selected = new Set(selectedIds);
        commitShapes(shapesRef.current.filter((shape) => !selected.has(shape.id)), null, t("status.groupedHoleConsumed"));
        return;
      }
      setNotice(result.failureNotice);
      return;
    }
    const selected = new Set(selectedIds);
    const editableGroup = canonicalizeShape({ ...group, groupOperation: "group" });
    commitShapes([...shapesRef.current.filter((shape) => !selected.has(shape.id)), editableGroup], editableGroup.id, t("status.groupedMany", { count: selectedShapes.length }));
  }, [commitShapes, selectedIds, selectedShapes]);

  /** Tinkercad's bundle (Ctrl+B): the parts move, turn and scale together and stay what they are. */
  const bundleSelected = useCallback(() => {
    if (selectedShapes.length < 2) {
      setNotice(t("status.selectTwoToBundle"));
      return;
    }
    if (selectedShapes.some((shape) => shape.locked)) {
      setNotice(t("status.unlockBeforeGroup"));
      return;
    }
    if (selectedShapes.some((shape) => isNonSolidShapeKind(shape.kind))) {
      setNotice(t("status.rulerNotSolid"));
      return;
    }
    const group = groupedShape(selectedShapes);
    if (!group) {
      setNotice(t("status.selectTwoToBundle"));
      return;
    }
    const selected = new Set(selectedIds);
    const bundle = canonicalizeShape({ ...group, name: "Bundle", groupOperation: "bundle" });
    commitShapes([...shapesRef.current.filter((shape) => !selected.has(shape.id)), bundle], bundle.id, t("status.bundledMany", { count: selectedShapes.length }));
  }, [commitShapes, selectedIds, selectedShapes]);

  const intersectSelected = useCallback(async () => {
    const groupable = selectedShapes.filter((shape) => !shape.locked && !isNonSolidShapeKind(shape.kind));
    if (!canIntersectShapes(groupable)) {
      setNotice(t("status.selectSolidAndHole"));
      return;
    }

    const sourceFingerprint = projectShapesFingerprint(shapesRef.current);
    const sourceProjectId = projectInfoRef.current.projectId;
    const result = await buildIntersectionShapeFromSelection(groupable, workspaceSettingsRef.current.booleanTriangleLimit);
    if (projectInfoRef.current.projectId !== sourceProjectId || projectShapesFingerprint(shapesRef.current) !== sourceFingerprint) {
      setNotice(t("status.intersectChanged"));
      return;
    }
    if (!result.group && !result.empty) {
      setNotice(result.failureNotice);
      return;
    }

    const operandIds = new Set(groupable.map((shape) => shape.id));
    const remainingShapes = shapesRef.current.filter((shape) => !operandIds.has(shape.id));
    if (result.empty) {
      commitShapes(remainingShapes, null, t("status.intersectionEmpty"));
      return;
    }

    const intersection = result.group ? canonicalizeShape({ ...result.group, groupOperation: "intersection" }) : null;
    if (!intersection) {
      return;
    }
    commitShapes([...remainingShapes, intersection], intersection.id, t("status.intersectedMany", { count: groupable.length }));
  }, [commitShapes, selectedShapes]);

  // Each step answers with what happened, so the buttons can show it and MCP can pass it on.
  const refuseOpenGroupStep = useCallback((message: string): OpenGroupOutcome => {
    setNotice(message);
    return { ok: false, message };
  }, []);

  /** Levels that end without a history step of their own count for the step the editor is on. */
  const endOpenGroupLevelsWithoutStep = useCallback((levels: OpenGroupLevel[]) => {
    const current = historyRef.current[historyIndexRef.current];
    if (current) openGroupHistoryRef.current.set(current.fingerprint, levels);
    setOpenGroupLevels(levels);
  }, [setOpenGroupLevels]);

  /** Opening and closing a level are not edits of the level around it: nothing to track. */
  const commitOpenGroupTransition = useCallback((levels: OpenGroupLevel[], next: WorkplaneShape[], selection: string | string[], message: string) => {
    setOpenGroupLevels(levels);
    openGroupTransitionRef.current = true;
    try {
      commitShapes(next, selection, message);
    } finally {
      openGroupTransitionRef.current = false;
    }
  }, [commitShapes, setOpenGroupLevels]);

  const openGroupForEditing = useCallback((id: string): OpenGroupOutcome => {
    if (openGroupBusyRef.current) return refuseOpenGroupStep(t("group.busy"));
    const levels = openGroupsRef.current;
    const innermost = levels.at(-1);
    if (innermost && !innermost.childIds.includes(id)) {
      return refuseOpenGroupStep(t("group.finishOpenFirst", { name: displayShapeName(innermost.original) }));
    }
    const group = shapesRef.current.find((shape) => shape.id === id);
    if (!group?.groupedShapes?.length) return refuseOpenGroupStep(t("status.selectGroupFirst"));
    if (group.locked) return refuseOpenGroupStep(t("status.unlockBeforeGroup"));
    const parts = restoreGroupedChildren(group);
    const childIds = parts.map((shape) => shape.id);
    const message = t("status.groupOpened", { name: displayShapeName(group) });
    commitOpenGroupTransition(
      [...levels, { original: group, childIds }],
      [...shapesRef.current.filter((shape) => shape.id !== group.id), ...parts],
      childIds,
      message,
    );
    return { ok: true, message, partIds: childIds };
  }, [commitOpenGroupTransition, refuseOpenGroupStep]);

  const cancelOpenGroup = useCallback((): OpenGroupOutcome => {
    const levels = openGroupsRef.current;
    const session = levels.at(-1);
    if (!session) return { ok: false, message: t("group.noneOpen") };
    if (openGroupBusyRef.current) return refuseOpenGroupStep(t("group.busy"));
    const parts = new Set(session.childIds);
    const message = t("status.groupOpenCancelled", { name: displayShapeName(session.original) });
    // The group comes back under its own id, which the level around it still lists.
    commitOpenGroupTransition(
      levels.slice(0, -1),
      [...shapesRef.current.filter((shape) => !parts.has(shape.id)), session.original],
      session.original.id,
      message,
    );
    return { ok: true, message, groupId: session.original.id };
  }, [commitOpenGroupTransition, refuseOpenGroupStep]);

  const finishOpenGroup = useCallback(async (): Promise<OpenGroupOutcome> => {
    const levels = openGroupsRef.current;
    const session = levels.at(-1);
    if (!session) return { ok: false, message: t("group.noneOpen") };
    if (openGroupBusyRef.current) return { ok: false, message: t("group.busy") };
    const { original, childIds } = session;
    const byId = new Map(shapesRef.current.map((shape) => [shape.id, shape]));
    // In their original order, unlocked - a part locked while the group was open still belongs in it.
    const parts = childIds.flatMap((id) => {
      const shape = byId.get(id);
      return shape ? [{ ...shape, locked: false }] : [];
    });
    if (parts.length < 2) {
      // Nothing to group: the part that is left takes the group's place in the level around it.
      const outer = levels.slice(0, -1);
      const parent = outer.at(-1);
      if (parent && parts.length) {
        const at = parent.childIds.indexOf(original.id) + 1;
        outer[outer.length - 1] = { ...parent, childIds: [...parent.childIds.slice(0, at), parts[0].id, ...parent.childIds.slice(at)] };
      }
      endOpenGroupLevelsWithoutStep(outer);
      const message = parts.length ? t("status.groupOnePartLeft") : t("status.groupNoPartsLeft");
      setNotice(message);
      return { ok: true, message, partIds: parts.map((shape) => shape.id) };
    }
    const sourceFingerprint = projectShapesFingerprint(shapesRef.current);
    const sourceProjectId = projectInfoRef.current.projectId;
    openGroupBusyRef.current = true;
    setOpenGroupBusy(true);
    try {
      const operation = original.groupOperation === "intersection" ? "intersection" : original.groupOperation === "bundle" ? "bundle" : "group";
      const result = operation === "intersection"
        ? await buildIntersectionShapeFromSelection(parts, workspaceSettingsRef.current.booleanTriangleLimit)
        : operation === "bundle"
          ? { group: groupedShape(parts) }
          : await buildGroupedShapeFromSelection(parts, workspaceSettingsRef.current.booleanTriangleLimit);
      if (
        projectInfoRef.current.projectId !== sourceProjectId ||
        projectShapesFingerprint(shapesRef.current) !== sourceFingerprint ||
        openGroupsRef.current.at(-1) !== session
      ) {
        return refuseOpenGroupStep(t("status.groupChanged"));
      }
      if (!result.group) {
        return refuseOpenGroupStep("failureNotice" in result && result.failureNotice ? result.failureNotice : t("status.groupChanged"));
      }
      // The group keeps what was its own: name, solid or hole, see-through, hidden -
      // and its colour, if it had been given one apart from its first part.
      const firstSolid = original.groupedShapes?.find((child) => !child.hole) ?? original.groupedShapes?.[0];
      const ownColour = Boolean(firstSolid && firstSolid.color !== original.color);
      const rebuilt = canonicalizeShape({ ...result.group, groupOperation: operation });
      // The same group, not a new one: its id stays, so anything holding that id
      // (MCP, the object list, the level around it) still finds it.
      const regrouped = canonicalizeShape(withHoleMode({
        ...rebuilt,
        id: original.id,
        name: original.name,
        color: ownColour ? original.color : rebuilt.color,
        transparent: original.transparent,
        hidden: original.hidden,
      }, Boolean(original.hole)));
      const partIds = new Set(parts.map((shape) => shape.id));
      const message = t("status.groupClosed", { name: displayShapeName(regrouped) });
      commitOpenGroupTransition(
        openGroupsRef.current.slice(0, -1),
        [...shapesRef.current.filter((shape) => !partIds.has(shape.id)), regrouped],
        regrouped.id,
        message,
      );
      return { ok: true, message, groupId: regrouped.id };
    } finally {
      openGroupBusyRef.current = false;
      setOpenGroupBusy(false);
    }
  }, [commitOpenGroupTransition, endOpenGroupLevelsWithoutStep, refuseOpenGroupStep]);

  // Undo past an opening brings that group back, and deleting every part leaves
  // nothing to close: in both cases that level is over, with every level inside it.
  useEffect(() => {
    if (!openGroups.length) return;
    const ids = new Set(shapes.map((shape) => shape.id));
    const stillOpen = openGroupLevelsStillOpen(
      openGroups.map((level) => ({ groupId: level.original.id, partIds: level.childIds })),
      ids,
    );
    if (stillOpen < openGroups.length) endOpenGroupLevelsWithoutStep(openGroups.slice(0, stillOpen));
  }, [endOpenGroupLevelsWithoutStep, openGroups, shapes]);

  /** Whether "Edit group" applies to this group right now. */
  const canEditGroup = useCallback(
    (shape: WorkplaneShape | null | undefined) =>
      Boolean(shape?.groupedShapes?.length) && canEditGroupAtLevel(openGroups.map((level) => ({ partIds: level.childIds })), shape!.id),
    [openGroups],
  );

  const editSelectedGroup = useCallback(() => {
    if (selectedShapes.length !== 1 || !selectedShapes[0].groupedShapes?.length) {
      setNotice(t("status.selectGroupFirst"));
      return;
    }
    openGroupForEditing(selectedShapes[0].id);
  }, [openGroupForEditing, selectedShapes]);

  const ungroupSelected = useCallback(() => {
    const groups = selectedShapes.filter((shape) => shape.groupedShapes?.length);
    if (groups.length === 0) {
      setNotice(t("status.selectGroupFirst"));
      return;
    }
    const groupIds = new Set(groups.map((shape) => shape.id));
    const restored = groups.flatMap(restoreGroupedChildren);
    commitShapes([...shapes.filter((shape) => !groupIds.has(shape.id)), ...restored], restored.map((shape) => shape.id), groups.length === 1 ? t("status.ungroupedOne") : t("status.ungroupedMany", { count: groups.length }));
  }, [commitShapes, selectedShapes, shapes]);

  /** Why a wrap failed, in the units the editor shows. */
  const cylinderWrapErrorText = useCallback((error: CylinderWrapError, shape: WorkplaneShape, diameter: number) => {
    const workspace = workspaceSettingsRef.current;
    const length = (value: number) => `${formatLengthMm(value, workspace.accuracy)} ${lengthDisplayUnit(workspace).label}`;
    if (error === "tooWide") {
      const flat = boundsForShapes([shape]);
      const width = flat ? flat.maxX - flat.minX : shapeWidth(shape);
      return t("status.wrapTooWide", { length: length(width), circumference: length(Math.PI * diameter), diameter: length(width / Math.PI) });
    }
    if (error === "tooThick") return t("status.wrapTooThick");
    if (error === "invalidDiameter") return t("status.wrapNeedsDiameter");
    return t("status.wrapNothing");
  }, []);

  const wrapSelectionAroundCylinder = useCallback((diameter: number, inward: boolean) => {
    if (selectedShapes.length !== 1 || !selectedShape) {
      setNotice(t("status.selectOneToWrap"));
      return;
    }
    if (!canWrapAroundCylinder(selectedShape)) {
      setNotice(t(selectedShape.locked ? "status.unlockBeforeWrap" : "status.selectOneToWrap"));
      return;
    }
    const wrapped = cylinderWrappedShape(selectedShape, diameter, inward);
    if (typeof wrapped === "string") {
      setNotice(cylinderWrapErrorText(wrapped, selectedShape, diameter));
      return;
    }
    const workspace = workspaceSettingsRef.current;
    commitShapes(
      shapes.map((shape) => (shape.id === selectedShape.id ? wrapped : shape)),
      [wrapped.id],
      t(inward ? "status.wrappedInward" : "status.wrappedAround", { diameter: `${formatLengthMm(diameter, workspace.accuracy)} ${lengthDisplayUnit(workspace).label}` }),
    );
  }, [commitShapes, cylinderWrapErrorText, selectedShape, selectedShapes.length, shapes]);

  /** The selected name tag as its panel shows it: words, font and layers read from its layers as they stand (#215). */
  const selectedNameTag = useMemo(
    () => (selectedShapes.length === 1 && selectedShape && selectedShape.kind !== "text" && offersTextLayers(selectedShape) ? textLayerStack(selectedShape) : null),
    [selectedShape, selectedShapes.length],
  );

  /** Splits the selected text into layers, or builds the selected stack again with new words, font or layers (#215). */
  const layerSelectedText = useCallback((patch: TextLayerPatch) => {
    if (selectedShapes.length !== 1 || !selectedShape || !offersTextLayers(selectedShape)) return;
    const stack = textLayerStack(selectedShape);
    if (!stack) return;
    const wasText = selectedShape.kind === "text";
    // The panel keeps the letter size through new words and fonts, and sets it for all layers at once.
    const source = nameTagSource(stack.source, patch);
    const layers = patch.layers ?? (wasText ? [...DEFAULT_TEXT_LAYERS] : stack.layers);
    // The key ring hole (#215) follows the letters: it is laid out from them on every build.
    const keyring = patch.keyring !== undefined ? patch.keyring : stack.keyring;
    const next = layeredTextShape(source, layers, wasText ? [] : stack.ids, selectedShape.id, selectedShape, stack.source.text, keyring);
    commitShapes(
      shapesRef.current.map((shape) => (shape.id === selectedShape.id ? next : shape)),
      [next.id],
      t(wasText ? "status.textLayered" : "status.textLayersUpdated", { count: layers.length }),
    );
  }, [commitShapes, selectedShape, selectedShapes.length]);

  /** One tag like the selected text or stack per name, in rows under it; the first takes its place (#215). */
  const makeTextTags = useCallback((names: string[], gap: number) => {
    if (selectedShapes.length !== 1 || !selectedShape || !offersTextLayers(selectedShape) || names.length === 0) return;
    const stack = textLayerStack(selectedShape);
    if (!stack) return;
    const tags = nameTagsFor(stack, names, gap, { id: selectedShape.id, ids: selectedShape.kind !== "text" ? stack.ids : [] });
    commitShapes(
      [...shapesRef.current.filter((shape) => shape.id !== selectedShape.id), ...tags],
      tags.map((tag) => tag.id),
      t("status.textTagsMade", { count: tags.length }),
    );
  }, [commitShapes, selectedShape, selectedShapes.length]);

  const simplifyToolShape = simplifyToolId && selectedShapes.length === 1 && selectedShape?.id === simplifyToolId && offersMeshSimplify(selectedShape)
    ? selectedShape
    : null;
  // The panel belongs to one body; with another selection it has nothing to show and goes.
  useEffect(() => {
    if (simplifyToolId && !simplifyToolShape) setSimplifyToolId(null);
  }, [simplifyToolId, simplifyToolShape]);

  /** Puts a font of one's own on every selected text, as one step. */
  const applyCustomFontToSelection = useCallback((fontId: string) => {
    const selected = new Set(selectedIdsRef.current);
    const texts = shapesRef.current.filter((shape) => selected.has(shape.id) && shape.kind === "text");
    if (!texts.length) return;
    const name = textFontLabel(fontId) ?? fontId;
    commitShapes(
      shapesRef.current.map((shape) => (selected.has(shape.id) && shape.kind === "text" ? canonicalizeShape({ ...shape, font: fontId }) : shape)),
      selectedIdsRef.current,
      t("font.usedOnText", { name }),
    );
  }, [commitShapes]);

  const startSimplifyTool = useCallback(() => {
    if (simplifyToolShape) {
      setSimplifyToolId(null);
      return;
    }
    if (selectedShapes.length !== 1 || !selectedShape || !offersMeshSimplify(selectedShape)) {
      setNotice(t("status.selectOneMeshToSimplify"));
      return;
    }
    if (selectedShape.locked) {
      setNotice(t("status.unlockBeforeSimplify"));
      return;
    }
    setSimplifyToolId(selectedShape.id);
  }, [selectedShape, selectedShapes.length, simplifyToolShape]);

  const applySimplifyTool = useCallback((positions: number[]) => {
    const target = simplifyToolShape;
    if (!target?.importedMesh || target.locked) return;
    const simplified = simplifiedMeshShape(target, positions);
    if (!simplified?.importedMesh) return;
    commitShapes(
      shapes.map((shape) => (shape.id === target.id ? simplified : shape)),
      [simplified.id],
      t("status.meshSimplified", { before: formatTriangleCount(target.importedMesh.triangleCount), after: formatTriangleCount(simplified.importedMesh.triangleCount) }),
    );
    setSimplifyToolId(null);
  }, [commitShapes, shapes, simplifyToolShape]);

  const separateSelectedParts = useCallback(() => {
    if (selectedShapes.length !== 1 || !selectedShape) {
      setNotice(t("status.selectOneToSeparate"));
      return;
    }
    if (selectedShape.locked) {
      setNotice(t("status.unlockBeforeSeparate"));
      return;
    }
    const parts = separateShapeParts(selectedShape);
    if (parts.length <= 1) {
      setNotice(t("status.onlyOnePart"));
      return;
    }
    commitShapes(
      [...shapes.filter((shape) => shape.id !== selectedShape.id), ...parts],
      parts.map((shape) => shape.id),
      t("status.separatedParts", { count: parts.length }),
    );
  }, [commitShapes, selectedShape, selectedShapes.length, shapes]);

  const mcpSceneSnapshot = useCallback((includeRawShapes = false): LayerlingMcpSceneSummary & { rawShapes?: WorkplaneShape[] } => {
    const projectInfo = projectInfoRef.current;
    const currentShapes = shapesRef.current;
    return {
      projectId: projectInfo.projectId,
      projectName: projectInfo.projectName,
      notice: noticeRef.current || t("status.ready"),
      selectedIds: selectedIdsRef.current,
      shapeCount: currentShapes.length,
      workspace: workspaceSettingsRef.current,
      snap: initialSnap ?? null,
      shapes: currentShapes.map(mcpShapeSummary),
      // The innermost level, as before nesting existed; openGroups has every level, outermost first.
      openGroup: openGroupsRef.current.length ? mcpOpenGroupSummary(openGroupsRef.current.at(-1)!) : null,
      openGroups: openGroupsRef.current.map(mcpOpenGroupSummary),
      workplane: {
        onBase: placementWorkplaneIsBase(placementWorkplaneRef.current),
        hidden: workplaneHiddenRef.current && !placementWorkplaneIsBase(placementWorkplaneRef.current),
        origin: placementWorkplaneRef.current.origin,
        normal: placementWorkplaneRef.current.normal,
      },
      ...(includeRawShapes ? { rawShapes: currentShapes.map((shape) => canonicalizeShape(shape)) } : {}),
    };
  }, [initialSnap]);

  /**
   * Der Schnitt als SVG, aus denselben Koerpern wie STL und 3MF: nur
   * Sichtbares, ohne Loecher, Gruppen verrechnet, Gleichfarbiges vereinigt und
   * verschiedene Farben gegeneinander freigestellt. Geschnitten wird der ganze
   * Entwurf, wie ihn die Schnittansicht zeigt - nicht nur die Auswahl.
   */
  const buildSectionSvg = useCallback(async (axis: SectionPlaneAxis, offset: number) => {
    const { visible, hiddenNote } = visibleExportShapes(shapesRef.current);
    const hiddenCount = shapesRef.current.length - visible.length;
    const { solids, meshes: cut } = await exportBodiesWithLooseHoles(visible);
    if (solids.length === 0) throw new Error(t("status.sectionSvgNothing"));
    const { meshes, quellen, gescheitert } = await colorSeparatedExportMeshes(solids, cut);
    const bodies = meshes.map((mesh, index) => {
      const source = solids[quellen[index]];
      return {
        name: source ? displayShapeName(source) : mesh.name,
        color: source?.color ?? "#000000",
        loops: sliceMeshContours(mesh, axis, offset),
      };
    });
    const result = sectionSvgDocument(bodies, axis, offset, `${projectName} - ${sectionAxisLetter(axis)} ${formatSectionOffset(offset)} mm`);
    if (!result) throw new Error(t("status.sectionSvgMissed"));
    return { result, hiddenNote, hiddenCount, unionFailed: gescheitert > 0 };
  }, [projectName]);

  /** Die Umrisse des Schnitts fuer das Messen - dieselben Koerper wie beim SVG. */
  const sectionContours = useCallback(async (axis: SectionPlaneAxis, offset: number) => {
    const { visible } = visibleExportShapes(shapesRef.current);
    const { solids, meshes: cut } = await exportBodiesWithLooseHoles(visible);
    if (solids.length === 0) return [];
    const { meshes } = await colorSeparatedExportMeshes(solids, cut);
    return meshes.flatMap((mesh) => sliceMeshContours(mesh, axis, offset));
  }, []);

  const exportSectionSvg = useCallback(async (axis: SectionPlaneAxis, offset: number) => {
    setNotice(t("status.buildingSectionSvg"), true);
    try {
      const { result, hiddenNote, unionFailed } = await buildSectionSvg(axis, offset);
      const name = `${projectName} ${t("camera.sectionFileSuffix")} ${sectionAxisLetter(axis)} ${formatSectionOffset(offset)} mm`;
      await downloadTextFile(projectExportFileName(name, "svg"), result.svg, "image/svg+xml;charset=utf-8");
      const parts = [t("status.sectionSvgExported", { count: result.loopCount, face: t(SECTION_SEEN_FROM_KEYS[SECTION_VIEW_FACE[axis]]) })];
      if (result.openCount > 0) parts.push(t("status.sectionSvgOpen", { count: result.openCount }));
      if (unionFailed) parts.push(t("status.sectionSvgOverlap"));
      setNotice(parts.join(" ") + hiddenNote, result.openCount > 0 || unionFailed);
    } catch (error) {
      setNotice(error instanceof Error ? localizedError(error.message) : t("status.sectionSvgFailed"), true);
    }
  }, [buildSectionSvg, projectName]);

  // Der Dateiimport steht weiter unten; die MCP-Aktion nimmt denselben Weg.
  const importFilesRef = useRef<((files: File[]) => Promise<{ importedIds: string[]; failures: Array<{ fileName: string; reason: string }> }>) | null>(null);

  // Custom shapes (#109): kept in this browser (IndexedDB) and, where the
  // shared store is on, in its "Custom shapes" folder. Shown on top of the
  // shape library; server entries carry the id "server:<file name>".
  const [myShapes, setMyShapes] = useState<MyShapeMeta[]>([]);
  const myShapesRef = useRef<MyShapeMeta[]>([]);
  const [serverShapes, setServerShapes] = useState<ServerCustomShape[] | null>(null);
  const serverShapesRef = useRef<ServerCustomShape[] | null>(null);
  const myShapesFileInputRef = useRef<HTMLInputElement | null>(null);
  const refreshMyShapes = useCallback(async () => {
    try {
      const list = await listMyShapes();
      myShapesRef.current = list;
      setMyShapes(list);
      return list;
    } catch {
      return myShapesRef.current;
    }
  }, []);
  const refreshServerShapes = useCallback(async () => {
    if (!sharedProjectsEnabled) {
      serverShapesRef.current = null;
      setServerShapes(null);
      return null;
    }
    try {
      const list = await listServerCustomShapes();
      serverShapesRef.current = list;
      setServerShapes(list);
      return list;
    } catch {
      return serverShapesRef.current;
    }
  }, [sharedProjectsEnabled]);
  useEffect(() => {
    void refreshMyShapes();
    return onMyShapesChanged(() => void refreshMyShapes());
  }, [refreshMyShapes]);
  useEffect(() => {
    void refreshServerShapes();
  }, [refreshServerShapes]);

  const customShapeEntries = useMemo<CustomShapeEntry[]>(() => [
    ...myShapes.map((shape) => ({ id: shape.id, name: shape.name, thumbnail: shape.thumbnail, location: "browser" as const })),
    ...(serverShapes ?? []).map((shape) => ({ id: `server:${shape.fileName}`, name: shape.name, thumbnail: shape.thumbnailUrl ?? "", location: "server" as const })),
  ], [myShapes, serverShapes]);

  const serverShapeFor = (id: string) => (id.startsWith("server:")
    ? serverShapesRef.current?.find((shape) => shape.fileName === id.slice("server:".length)) ?? null
    : null);
  const customShapeName = (id: string) => serverShapeFor(id)?.name ?? myShapesRef.current.find((shape) => shape.id === id)?.name ?? id;

  /** Bodies packed as a custom shape: centred on the origin, standing on the plate, with a preview. */
  const packCustomShape = useCallback(async (parts: WorkplaneShape[], name: string, assets: ProjectAsset[]) => {
    const kept = shapesForLibrary(parts, boundsForShapes(parts));
    const now = Date.now();
    const bytes = await exportLylProject({
      projectName: name,
      createdAt: now,
      modifiedAt: now,
      shapes: kept,
      notes: [],
      history: [],
      historyIndex: 0,
      assets,
      workspace: workspaceSettingsRef.current,
      snapGrid: snapGridRef.current,
      placementElevation: 0,
    });
    const thumbnail = renderMyShapeThumbnail(kept.map((shape) => {
      const mesh = meshForShape(shape);
      return { vertices: mesh.vertices, faces: mesh.faces, color: shape.color, hole: shape.hole };
    }), 256);
    return { bytes, thumbnail, bodyCount: kept.length, fingerprint: projectShapesFingerprint(kept), createdAt: now };
  }, []);

  const keepInBrowser = useCallback(async (packed: Awaited<ReturnType<typeof packCustomShape>>, name: string) => {
    const meta: MyShapeMeta = {
      id: createLocalId("my-shape"),
      name,
      createdAt: packed.createdAt,
      thumbnail: packed.thumbnail,
      bodyCount: packed.bodyCount,
      byteLength: packed.bytes.byteLength,
      fingerprint: packed.fingerprint,
    };
    await saveMyShape(meta, packed.bytes);
    return meta;
  }, []);

  /** Where a new custom shape goes when nobody says: the server, when there is one. */
  const defaultCustomShapeLocation = (): CustomShapeLocation => (serverShapesRef.current ? "server" : "browser");

  const saveSelectionAsMyShape = useCallback(async (name: string, ids?: string[], location: CustomShapeLocation = defaultCustomShapeLocation()) => {
    const wanted = new Set(ids ?? selectedIdsRef.current);
    const parts = shapesRef.current.filter((shape) => wanted.has(shape.id));
    if (parts.length === 0) throw new Error(t("myShapes.selectFirst"));
    const packed = await packCustomShape(parts, name, projectAssetsRef.current);
    let entry: { id: string; name: string; location: CustomShapeLocation; bodyCount: number; byteLength: number };
    if (location === "server") {
      const saved = await saveServerCustomShape(name, packed.bytes, packed.thumbnail, t("status.myShapeNameTaken", { name }));
      await refreshServerShapes();
      entry = { id: `server:${saved.fileName}`, name: saved.name, location, bodyCount: packed.bodyCount, byteLength: packed.bytes.byteLength };
    } else {
      const meta = await keepInBrowser(packed, name);
      await refreshMyShapes();
      entry = { id: meta.id, name, location, bodyCount: meta.bodyCount, byteLength: meta.byteLength };
    }
    setNotice(t(location === "server" ? "status.myShapeSavedServer" : "status.myShapeSaved", { name: entry.name }));
    return entry;
  }, [keepInBrowser, packCustomShape, refreshMyShapes, refreshServerShapes]); // eslint-disable-line react-hooks/exhaustive-deps

  const readCustomShapePackage = (id: string) => {
    const server = serverShapeFor(id);
    if (id.startsWith("server:")) {
      if (!server) throw new Error(t("status.myShapeGone"));
      return readServerCustomShape(server.fileName);
    }
    return readMyShapePackage(id);
  };

  const insertMyShape = useCallback(async (id: string, point?: PlacementPoint) => {
    const sourceProjectId = projectInfoRef.current.projectId;
    const name = customShapeName(id);
    const restored = await importLylProject(await readCustomShapePackage(id));
    if (projectInfoRef.current.projectId !== sourceProjectId) throw new Error(t("status.pasteCancelled"));
    if (restored.shapes.length === 0) throw new Error(t("status.insertDesignEmpty", { name }));
    const target = point ?? placementWorkplaneRef.current.origin;
    // Centred again on the way in: a shape on the server may have been opened
    // and changed like a design, and moved off the middle doing so.
    const centred = shapesForLibrary(restored.shapes, boundsForShapes(restored.shapes));
    const inserted = shapesFromLibrary(centred, target)
      .map((shape) => canonicalizeShape(cloneWorkplaneShapeTreeWithFreshIds(shape, "insert")));
    if (restored.assets.length > 0) {
      const nextAssets = dedupeProjectAssets([...projectAssetsRef.current, ...restored.assets]);
      projectAssetsRef.current = nextAssets;
      setProjectAssets(nextAssets);
    }
    commitShapes([...shapesRef.current, ...inserted], inserted.map((shape) => shape.id), t("status.myShapeInserted", { name }));
    return inserted;
  }, [commitShapes]); // eslint-disable-line react-hooks/exhaustive-deps

  const renameMyShapeEntry = useCallback(async (id: string, name: string) => {
    const server = serverShapeFor(id);
    if (server) {
      await renameServerCustomShape(server, name, t("status.myShapeNameTaken", { name }));
      await refreshServerShapes();
      return;
    }
    await renameMyShape(id, name);
    await refreshMyShapes();
  }, [refreshMyShapes, refreshServerShapes]); // eslint-disable-line react-hooks/exhaustive-deps

  const deleteMyShapeEntry = useCallback(async (id: string) => {
    const name = customShapeName(id);
    const server = serverShapeFor(id);
    if (server) {
      await deleteServerCustomShape(server);
      await refreshServerShapes();
    } else {
      await deleteMyShape(id);
      await refreshMyShapes();
    }
    setNotice(t("status.myShapeDeleted", { name }));
  }, [refreshMyShapes, refreshServerShapes]); // eslint-disable-line react-hooks/exhaustive-deps

  /** A shape from this browser onto the server. A move, as on the start page: it is not kept twice. */
  const moveMyShapeToServer = useCallback(async (id: string) => {
    const meta = myShapesRef.current.find((shape) => shape.id === id);
    if (!meta) throw new Error(t("status.myShapeGone"));
    const bytes = await readMyShapePackage(id);
    await saveServerCustomShape(meta.name, bytes, meta.thumbnail, t("status.myShapeNameTaken", { name: meta.name }));
    await deleteMyShape(id);
    await Promise.all([refreshMyShapes(), refreshServerShapes()]);
    setNotice(t("status.myShapeMovedToServer", { name: meta.name }));
  }, [refreshMyShapes, refreshServerShapes]);

  const backUpMyShapes = useCallback(async () => {
    const entries = await customShapesBackupEntries();
    const count = entries.length - 1;
    if (count <= 0) {
      setNotice(t("status.myShapesNoneToBackUp"));
      return;
    }
    const zipped = packBackup(entries);
    const buffer = zipped.buffer.slice(zipped.byteOffset, zipped.byteOffset + zipped.byteLength) as ArrayBuffer;
    await downloadBlobFile(myShapesBackupFileName(new Date()), new Blob([buffer], { type: "application/zip" }));
    setNotice(t("status.myShapesBackedUp", { count }));
  }, []);

  /**
   * Adds shapes to this browser: the custom shapes of a backup ZIP (from here
   * or from "Back up all" on the start page), the designs of a ZIP without
   * any, or single .lyl designs. One already kept is skipped.
   */
  const loadMyShapeFiles = useCallback(async (files: File[]) => {
    let added = 0;
    let skipped = 0;
    const failures: string[] = [];
    const packEntry = async (entry: { name: string; bytes: Uint8Array }) => {
      const restored = await importLylProject(entry.bytes);
      if (restored.shapes.length === 0) {
        failures.push(entry.name);
        return;
      }
      const name = myShapeNameFromFile(entry.name, t("myShapes.defaultName"));
      const fingerprint = projectShapesFingerprint(shapesForLibrary(restored.shapes, boundsForShapes(restored.shapes)));
      if (myShapesRef.current.some((shape) => shape.name === name && shape.fingerprint === fingerprint)) {
        skipped += 1;
        return;
      }
      const meta = await keepInBrowser(await packCustomShape(restored.shapes, name, restored.assets), name);
      myShapesRef.current = [...myShapesRef.current, meta];
      added += 1;
    };
    for (const file of files) {
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (!/\.zip$/i.test(file.name)) {
          await packEntry({ name: file.name, bytes });
          continue;
        }
        const fromBackup = await restoreCustomShapesFromBackup(bytes);
        added += fromBackup.added;
        skipped += fromBackup.skipped;
        await refreshMyShapes();
        const loose = fromBackup.added + fromBackup.skipped + fromBackup.unlisted.length > 0 ? fromBackup.unlisted : unpackBackup(bytes);
        if (loose.length === 0 && fromBackup.added + fromBackup.skipped === 0) failures.push(file.name);
        for (const entry of loose) {
          try {
            await packEntry(entry);
          } catch {
            failures.push(entry.name);
          }
        }
      } catch {
        failures.push(file.name);
      }
    }
    await refreshMyShapes();
    setNotice(failures.length
      ? t("status.myShapesLoadFailed", { count: added, names: failures.join(", ") })
      : skipped
        ? t("status.myShapesLoadedSkipped", { count: added, skipped })
        : t("status.myShapesLoaded", { count: added }));
  }, [keepInBrowser, packCustomShape, refreshMyShapes]);

  const executeMcpCommand = useCallback(async (command: LayerlingMcpCommand): Promise<unknown> => {
    const params = command.params ?? {};
    const currentShapes = () => shapesRef.current;
    const findShape = (id: unknown) => (typeof id === "string" ? currentShapes().find((shape) => shape.id === id) ?? null : null);

    try {
      lastMcpErrorRef.current = null;
      // The workplane shows an older state while the history view is open, so a change would land on a design nobody sees.
      if (historyViewStateRef.current && !HISTORY_VIEW_MCP_ACTIONS.has(command.action)) {
        throw new Error("The history view is open. Close it with layerling_set_history_view (open: false) before changing the design.");
      }
      if (command.action === "get_scene") {
        return mcpSceneSnapshot(params.includeRawShapes === true);
      }

      if (command.action === "set_history_view") {
        const entries = historyRef.current;
        const showing = historyViewStateRef.current;
        if (params.open === false) {
          if (showing) closeHistoryView();
          return { open: false, states: entries.length, current: historyIndexRef.current };
        }
        if (params.open === undefined && params.index === undefined) {
          return showing
            ? { open: true, index: showing.index, states: entries.length, current: historyIndexRef.current, recordedAt: showing.entry.at ?? null, shapeCount: showing.shapes.length }
            : { open: false, states: entries.length, current: historyIndexRef.current };
        }
        if (entries.length <= 1) throw new Error("There is no earlier state to look at yet");
        if (!showing) {
          if (projectInteractionActiveRef.current) throw new Error("Finish the current action before opening the history view");
          openHistoryView();
        }
        const requested = params.index === undefined ? historyIndexRef.current : Math.round(mcpNumber(params.index, historyIndexRef.current));
        const state = historyStateAt(entries, requested);
        if (!state) throw new Error("There is no earlier state to look at yet");
        setHistoryViewIndex(state.index);
        return {
          open: true,
          index: state.index,
          states: entries.length,
          current: historyIndexRef.current,
          recordedAt: state.entry.at ?? null,
          shapeCount: state.shapes.length,
          objects: state.shapes.map((shape) => ({ id: shape.id, name: shape.name, kind: shape.kind, x: shape.x, z: shape.z, width: shape.width, depth: shape.depth, height: shape.height, hidden: Boolean(shape.hidden) })),
        };
      }

      if (command.action === "list_objects") {
        return { objects: currentShapes().map(mcpShapeSummary) };
      }

      if (command.action === "select_objects") {
        const requestedIds = mcpStringArray(params.ids ?? params.id);
        const validIds = requestedIds.filter((id) => currentShapes().some((shape) => shape.id === id));
        setSelectedIds(validIds);
        selectedIdsRef.current = validIds;
        setNotice(validIds.length === 0
          ? t("status.mcpCleared")
          : validIds.length === 1 ? t("status.mcpSelectedOne") : t("status.mcpSelectedMany", { count: validIds.length }));
        return { selectedIds: validIds, objects: currentShapes().filter((shape) => validIds.includes(shape.id)).map(mcpShapeSummary) };
      }

      if (command.action === "delete_objects") {
        const requestedIds = mcpStringArray(params.ids ?? params.id);
        const ids = requestedIds.length ? new Set(requestedIds) : new Set(selectedIdsRef.current);
        const deleted = currentShapes().filter((shape) => ids.has(shape.id));
        if (deleted.length === 0) throw new Error("No matching objects to delete");
        commitShapes(currentShapes().filter((shape) => !ids.has(shape.id)), [], deleted.length === 1 ? t("status.mcpDeletedOne") : t("status.mcpDeletedMany", { count: deleted.length }));
        selectedIdsRef.current = [];
        return { deletedIds: deleted.map((shape) => shape.id), deletedCount: deleted.length };
      }

      if (command.action === "create_shape") {
        const rawKind = mcpString(params.kind, "box");
        const kind = rawKind === "cube" ? "box" : rawKind;
        const width = Math.max(MIN_SHAPE_DIMENSION, mcpNumber(params.width ?? params.size, 20));
        const depth = Math.max(MIN_SHAPE_DIMENSION, mcpNumber(params.depth ?? params.size, rawKind === "cube" ? width : 20));
        const height = Math.max(MIN_SHAPE_DIMENSION, mcpNumber(params.height ?? params.size, rawKind === "cube" ? width : 20));
        const x = mcpNumber(params.x, 0);
        const z = mcpNumber(params.z, 0);
        const elevation = mcpNumber(params.elevation, placementElevation);
        // Die Farbe steht schon im Katalog; zwei fest eingetragene Farbwerte
        // waeren die dritte Stelle, an der eine neue Form vergessen wird.
        const asset = toolbarShapeAssets.find((entry) => entry.kind === kind);
        const color = mcpString(params.color, asset?.color ?? "#d41721");
        const name = mcpString(params.name, kind === "sketch" ? "Sketch extrusion" : rawKind === "cube" ? "Cube" : asset?.name ?? "Box");
        // Nur was ausdruecklich verlangt wurde: sonst gilt das Mass, mit dem der
        // Katalog diese Form auch von Hand auf die Ebene legt.
        const requestedWidth = mcpOptionalNumber(params.width ?? params.size);
        const requestedDepth = mcpOptionalNumber(params.depth ?? params.size) ?? (rawKind === "cube" ? requestedWidth : undefined);
        const requestedHeight = mcpOptionalNumber(params.height ?? params.size) ?? (rawKind === "cube" ? requestedWidth : undefined);
        let shape: WorkplaneShape;
        if (kind === "sketch") {
          // A stroke builds the outline as a frame, as the editor's Stroke does (#154).
          const stroke = normalizeSketchStroke(params.stroke);
          const profile = { ...defaultMcpSketchProfile(width, depth), ...(stroke ? { stroke } : {}), ...(params.silhouette === true ? { silhouette: true } : {}) };
          const extruded = await cadShapeFromSketchProfile(profile, height);
          shape = canonicalizeShape({
            ...extruded,
            name,
            color,
            x,
            z,
            elevation,
            rotation: mcpNumber(params.rotation, 0),
            rotationX: mcpNumber(params.rotationX, 0),
            rotationZ: mcpNumber(params.rotationZ, 0),
          });
        } else if (asset) {
          // Eine Normgroesse beim Namen wird zuerst zu Durchmesser, Steigung
          // und Profil - danach geht alles den gewohnten Weg.
          const shapeParams = asset.kind === "thread" ? mcpThreadSizeParams(params, DEFAULT_THREAD_PROFILE) : params;
          // Welche Formen es gibt, sagt der Katalog - dieselbe Quelle wie das
          // Formenmenue. Eine eigene Aufzaehlung hier waere nur die naechste
          // Stelle, an der eine neue Form vergessen wird. Fehlende Werte fuellt
          // `makeShapeFromAsset` genau so, wie es beim Ziehen auf die Ebene
          // geschieht: Ein Gewinde bekommt den Platzbedarf seines Durchmessers,
          // ein Zahnrad seine Zaehne, ein Zylinder seine offene Seitenzahl.
          shape = makeShapeFromAsset(
            { ...asset, name, color },
            { x, z, elevation },
            {
              ...mcpShapeCustomization(asset.kind, shapeParams),
              width: requestedWidth,
              depth: requestedDepth,
              height: requestedHeight,
            },
          );
          shape = {
            ...shape,
            rotation: mcpNumber(params.rotation, 0),
            rotationX: mcpNumber(params.rotationX, 0),
            rotationZ: mcpNumber(params.rotationZ, 0),
            // Ein Gewindeloch ist zum Abziehen da, alles andere ist Material.
            hole: typeof params.hole === "boolean" ? params.hole : shape.threadRole === "bore",
          };
          if (shape.kind === "thread") {
            shape = applyMcpThreadSettings(shape, shapeParams, true);
          }
          shape = { ...shape, ...mcpTaperPatch(shape, params, shapeDimensionLimit(workspaceSettingsRef.current, shape.kind, DEFAULT_TAPER_DIMENSION_MAX)) };
          shape = { ...shape, ...mcpExtrudeDeformPatch(shape, params) };
          if (shape.kind === "bentTube") {
            shape = { ...shape, ...mcpBentTubePatch(shape, params) };
          }
          if (shape.kind === "text" && shape.textCurved) {
            shape = { ...shape, ...curvedTextPatch({ ...shape, textCurved: false }, { textCurved: true, textRadius: shape.textRadius, textSize: shape.textSize }) };
          }
        } else {
          throw new Error(`MCP create_shape does not know a shape called "${rawKind}"`);
        }
        // Auf einer Arbeitsebene an einer Flaeche steht die neue Form auf ihr,
        // wie beim Ablegen von Hand; x und z zaehlen dann auf dieser Flaeche.
        // Wer Hoehe oder Drehung selbst angibt, meint die Grundplatte.
        const activeWorkplane = placementWorkplaneRef.current;
        if (!placementWorkplaneIsBase(activeWorkplane) && [params.elevation, params.rotation, params.rotationX, params.rotationZ].every((value) => value === undefined)) {
          const point = placementWorkplanePoint(activeWorkplane, x, z);
          shape = canonicalizeShape({ ...shape, ...placementPatchForNewShape(shape, activeWorkplane, point) });
        }
        // A font of one's own passes the shape defaults by; it is set here, by id or by name.
        const ownFont = shape.kind === "text" && typeof params.font === "string" ? mcpTextFont(params.font) : null;
        if (ownFont && isCustomFontId(ownFont)) shape = canonicalizeShape({ ...shape, font: ownFont });
        const committedShape = canonicalizeShape(bakeShapeTransformIntoMesh(shape));
        commitShapes([...currentShapes(), committedShape], committedShape.id, t("status.shapeAddedMcp", { name: displayShapeName(committedShape) }));
        return { object: mcpShapeSummary(committedShape) };
      }

      if (command.action === "import_mesh") {
        const positions = mcpFiniteNumberArray(params.positions);
        const normals = mcpFiniteNumberArray(params.normals);
        if (positions.length < 9 || positions.length % 9 !== 0) {
          throw new Error("import_mesh requires positions as triangle xyz values");
        }
        let minX = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        let minZ = Number.POSITIVE_INFINITY;
        let maxZ = Number.NEGATIVE_INFINITY;
        for (let index = 0; index < positions.length; index += 3) {
          const x = positions[index];
          const y = positions[index + 1];
          const z = positions[index + 2];
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
          minZ = Math.min(minZ, z);
          maxZ = Math.max(maxZ, z);
        }
        const width = Math.max(MIN_SHAPE_DIMENSION, mcpNumber(params.width, maxX - minX));
        const depth = Math.max(MIN_SHAPE_DIMENSION, mcpNumber(params.depth, maxZ - minZ));
        const height = Math.max(MIN_SHAPE_DIMENSION, mcpNumber(params.height, maxY - minY));
        const shape = canonicalizeShape({
          id: createLocalId("mcp-imported-mesh"),
          name: mcpString(params.name, "Imported mesh"),
          kind: "mesh",
          color: mcpString(params.color, "#9bd7f0"),
          x: mcpNumber(params.x, 0),
          z: mcpNumber(params.z, 0),
          elevation: mcpNumber(params.elevation, 0),
          size: Math.max(width, depth),
          width,
          depth,
          height,
          rotation: mcpNumber(params.rotation, 0),
          rotationX: mcpNumber(params.rotationX, 0),
          rotationZ: mcpNumber(params.rotationZ, 0),
          importedMesh: {
            positions,
            normals: normals.length === positions.length ? normals : undefined,
            baseWidth: width,
            baseDepth: depth,
            baseHeight: height,
            triangleCount: Math.floor(positions.length / 9),
            sourceFormat: "json",
          },
          locked: false,
          hidden: false,
        } satisfies WorkplaneShape);
        commitShapes([...currentShapes(), shape], shape.id, t("status.shapeImportedMcp", { name: displayShapeName(shape) }));
        return { object: mcpShapeSummary(shape) };
      }

      if (command.action === "update_object") {
        const gefunden = findShape(params.id);
        if (!gefunden) throw new Error("Object not found");
        // Ein gedrehter Koerper ist ein Netz mit Gedaechtnis. Gedeutet werden
        // die Werte an seiner Urform - sonst kennt das Netz weder Durchmesser
        // noch Seitenzahl, und der Befehl faellt still unter den Tisch.
        const target = shapeWithParametricSource(gefunden);
        // Ein gesperrtes Objekt bleibt unantastbar - es sei denn, der Befehl
        // hebt die Sperre gerade auf. Sonst fuehrt von aussen kein Weg zurueck:
        // Sperren kann die Oberflaeche, entsperren konnte hier bisher niemand.
        if (target.locked && params.locked !== false) {
          throw new Error("Unlock the object before updating it, or pass locked: false");
        }
        const patch: ShapeUpdatePatch = {};
        const rotationWasRequested = [params.rotation, params.rotationX, params.rotationZ].some(
          (value) => typeof value === "number" && Number.isFinite(value),
        );
        (["x", "z", "elevation", "width", "depth", "height", "size", "rotation", "rotationX", "rotationZ"] as const).forEach((key) => {
          if (typeof params[key] === "number" && Number.isFinite(params[key])) {
            patch[key] = params[key];
          }
        });
        if (typeof params.color === "string") patch.color = params.color;
        if (typeof params.name === "string") patch.name = params.name;
        if (typeof params.hole === "boolean") patch.hole = params.hole;
        if (typeof params.locked === "boolean") patch.locked = params.locked;
        if (typeof params.hidden === "boolean") patch.hidden = params.hidden;
        if (typeof params.transparent === "boolean") patch.transparent = params.transparent || undefined;
        if (typeof params.multicolor === "boolean") patch.multicolor = params.multicolor;
        if (typeof params.font === "string") patch.font = mcpTextFont(params.font) ?? params.font;
        // Alles Formeigene in einem Zug, mit denselben Grenzen wie im
        // Merkmalsfeld: Seitenzahl, Kegelradien, Zahnrad, Gewinde, Feder,
        // Beschriftung. Was die Art gar nicht kennt, faellt dabei weg.
        const shapeParams = target.kind === "thread" ? mcpThreadSizeParams(params, threadSettings(target).profile) : params;
        const settings = mcpShapeCustomization(target.kind, shapeParams);
        (Object.keys(settings) as (keyof ShapeCustomization)[]).forEach((key) => {
          const value = settings[key];
          if (value !== undefined) Object.assign(patch, { [key]: value });
        });
        // Die Verjuengung liest sich aus demselben Objekt, das der Befehl gerade
        // umbaut - erst Breite und Tiefe anwenden, dann die Kanten darauf.
        Object.assign(patch, mcpTaperPatch({ ...target, ...patch }, params, shapeDimensionLimit(workspaceSettingsRef.current, target.kind, DEFAULT_TAPER_DIMENSION_MAX)));
        Object.assign(patch, mcpExtrudeDeformPatch({ ...target, ...patch }, params));
        if (target.kind === "loft") {
          // The stored ends were set above as they came; the frame and the place follow from them here.
          const change = mcpLoftChange(params);
          if (Object.keys(change).length) Object.assign(patch, loftShapePatch(target, change));
        }
        if (target.kind === "bentTube" && MCP_BENT_TUBE_KEYS.some((key) => params[key] !== undefined)) {
          const withSettings = { ...target, ...patch };
          const requested = {
            width: typeof params.width === "number" ? params.width : undefined,
            depth: typeof params.depth === "number" ? params.depth : undefined,
            height: typeof params.height === "number" ? params.height : undefined,
            size: typeof params.size === "number" ? params.size : undefined,
            bentTubeSegments: params.bentTubeSegments,
          };
          Object.assign(patch, mcpBentTubePatch(withSettings, requested));
        }
        if (target.kind === "thread") {
          // Der Durchmesser zieht den Platzbedarf mit - sonst macht die
          // Vereinheitlichung die Aenderung gleich wieder rueckgaengig. Und ein
          // Kopf, der bisher auf seinem Normmass stand, wandert mit.
          const before = threadSettings(target);
          const headWasStandard = Math.abs(before.headHeight - defaultThreadHeadHeight(before)) < 1e-6;
          const threaded = applyMcpThreadSettings({ ...target, ...patch }, shapeParams, headWasStandard);
          Object.assign(patch, {
            threadRole: threaded.threadRole,
            threadHead: threaded.threadHead,
            threadHand: threaded.threadHand,
            threadProfile: threaded.threadProfile,
            threadDiameter: threaded.threadDiameter,
            threadPitch: threaded.threadPitch,
            threadClearance: threaded.threadClearance,
            threadBoltClearance: threaded.threadBoltClearance,
            threadQuality: threaded.threadQuality,
            threadHeadHeight: threaded.threadHeadHeight,
            threadChamfer: threaded.threadChamfer,
            threadHeadChamfer: threaded.threadHeadChamfer,
            width: threaded.width,
            depth: threaded.depth,
          });
          // Ein Gewindeloch ist zum Abziehen da; wer die Art wechselt, meint das.
          if (typeof params.hole !== "boolean" && threaded.threadRole !== target.threadRole) {
            patch.hole = threaded.threadRole === "bore";
          }
        }
        // A text's fill (#215) takes the same words as a sketch body's: `stroke` as an object or
        // null, `silhouette` true or false. The box follows the fill in curvedTextPatch.
        if (target.kind === "text") {
          if (params.stroke !== undefined) {
            if (params.stroke === null || params.stroke === false) {
              patch.textStroke = undefined;
            } else {
              const stroke = normalizeSketchStroke({ ...DEFAULT_SKETCH_STROKE, ...target.textStroke, ...(params.stroke as object) });
              if (!stroke) throw new Error("stroke needs a width above 0, or null for the filled letters");
              patch.textStroke = stroke;
            }
          }
          if (typeof params.silhouette === "boolean") patch.textSilhouette = params.silhouette || undefined;
        }
        const pivotRequest = mcpPivotRequest(params.rotationPivot);
        const withPivotRequest = (shape: WorkplaneShape) => pivotRequest === undefined
          ? shape
          : { ...shape, rotationPivot: pivotRequest ? shapePivotFromWorld(shape, pivotRequest) : undefined };
        const nextShapes = currentShapes().map((shape) => {
          if (shape.id !== target.id) return shape;
          const sauber = cleanShapePatch(patch);
          const neugebaut = patchTouchesBodyParameters(sauber) ? rebuiltParametricShape(shape, sauber) : null;
          if (neugebaut) return withPivotRequest(neugebaut);
          const merged = { ...shape, ...curvedTextPatch(shape, sauber) };
          // Solid/hole goes through the same rule as the inspector: a mixed group keeps its parts' own state.
          const patched = typeof sauber.hole === "boolean" ? withHoleMode(merged, sauber.hole, sauber.color) : merged;
          const width = shapeWidth(patched);
          const depth = shapeDepth(patched);
          const canonical = withPivotRequest(canonicalizeShape({ ...patched, size: Math.max(width, depth) }));
          return rotationWasRequested ? canonicalizeShape(bakeShapeTransformIntoMesh(canonical)) : canonical;
        });
        let updated = nextShapes.find((shape) => shape.id === target.id) as WorkplaneShape;
        commitShapes(nextShapes, target.id, t("status.shapeUpdatedMcp", { name: displayShapeName(updated) }));
        // The fill of an extruded sketch (#197): built again from its sketch, as the inspector does.
        const fillProfile = updated.sketchProfile && updated.sketchOperation !== "revolve"
          ? mcpSketchFillProfile(updated.sketchProfile, params)
          : null;
        if (fillProfile) {
          updated = await rebuildSketchBodyFill(target.id, fillProfile);
          commitShapes(currentShapes().map((shape) => shape.id === target.id ? updated : shape), target.id, t("status.sketchUpdated"));
        }
        return { object: mcpShapeSummary(updated) };
      }

      if (command.action === "open_group") {
        const id = typeof params.id === "string" ? params.id : selectedIdsRef.current.length === 1 ? selectedIdsRef.current[0] : null;
        if (!id) throw new Error("open_group needs the id of one group");
        const outcome = openGroupForEditing(id);
        if (!outcome.ok) throw new Error(outcome.message);
        return { partIds: outcome.partIds, objects: currentShapes().filter((shape) => outcome.partIds?.includes(shape.id)).map(mcpShapeSummary) };
      }

      if (command.action === "close_group") {
        const outcome = params.cancel === true ? cancelOpenGroup() : await finishOpenGroup();
        if (!outcome.ok) throw new Error(outcome.message);
        const group = outcome.groupId ? findShape(outcome.groupId) : null;
        return { message: outcome.message, object: group ? mcpShapeSummary(group) : null, partIds: outcome.partIds ?? [] };
      }

      if (command.action === "mate_faces") {
        const all = currentShapes();
        const mover = all.find((shape) => shape.id === params.id);
        const target = all.find((shape) => shape.id === params.targetId);
        if (!mover || !target) throw new Error("mate_faces needs id and targetId of two existing objects");
        if (mover.id === target.id) throw new Error("mate_faces needs two different objects");
        if (mover.locked) throw new Error("Unlock the object before moving it");
        const faceOf = (shape: WorkplaneShape, side: unknown, label: string): FacePick => {
          if (typeof side !== "string" || !(side in LAY_FLAT_SIDES)) throw new Error(`mate_faces needs ${label} (bottom/top/left/right/front/back)`);
          const [x, y, z] = LAY_FLAT_SIDES[side as LayFlatSide];
          const normal = nearestFaceNormal(shape, new THREE.Vector3(x, y, z).applyQuaternion(quaternionForShape(shape)));
          if (!normal) throw new Error(`mate_faces found no ${side} face on ${displayShapeName(shape)}`);
          // The outermost corner along the normal lies in the face's plane.
          let point = new THREE.Vector3();
          let reach = Number.NEGATIVE_INFINITY;
          meshForShape(shape).vertices.forEach(([vx, vy, vz]) => {
            const along = vx * normal.x + vy * normal.y + vz * normal.z;
            if (along > reach) {
              reach = along;
              point = new THREE.Vector3(vx, vy, vz);
            }
          });
          return { shapeId: shape.id, normal: { x: normal.x, y: normal.y, z: normal.z }, point: { x: point.x, y: point.y, z: point.z } };
        };
        const mode: MateMode = params.mode === "flush" ? "flush" : "against";
        const gap = typeof params.gap === "number" && Number.isFinite(params.gap) ? params.gap : 0;
        const nextShapes = matedShapes(all, faceOf(mover, params.face, "face"), faceOf(target, params.targetFace, "targetFace"), mode, gap);
        commitShapes(nextShapes, [mover.id], t("status.mated"));
        return { mode, gap, object: mcpShapeSummary(nextShapes.find((shape) => shape.id === mover.id) as WorkplaneShape) };
      }

      if (command.action === "scale_objects") {
        const requestedIds = mcpStringArray(params.ids ?? params.id);
        const ids = requestedIds.length ? requestedIds : selectedIdsRef.current;
        const percent = typeof params.percent === "number" ? params.percent : Number.NaN;
        const mode = params.mode === "each" ? "each" : "together";
        if (ids.length === 0) throw new Error("scale_objects needs ids or a selection");
        const result = scaleSelectionByPercent(ids, percent, mode);
        if (!result.ok) throw new Error(result.message);
        const scaled = new Set(ids);
        return {
          percent,
          mode,
          skippedLocked: result.skipped,
          objects: currentShapes().filter((shape) => scaled.has(shape.id)).map(mcpShapeSummary),
        };
      }

      if (command.action === "lay_flat") {
        const requestedIds = mcpStringArray(params.ids ?? params.id);
        const ids = new Set(requestedIds.length ? requestedIds : selectedIdsRef.current);
        const all = currentShapes();
        const movable = all.filter((shape) => ids.has(shape.id));
        if (movable.length === 0) throw new Error("lay_flat needs ids or a selection");
        if (movable.some((shape) => shape.locked)) throw new Error("Unlock the objects before laying them flat");
        const referenceId = typeof params.referenceId === "string" ? params.referenceId : movable[0].id;
        const reference = movable.find((shape) => shape.id === referenceId) ?? movable[0];
        const side = typeof params.face === "string" && params.face in LAY_FLAT_SIDES ? params.face as LayFlatSide : null;
        const rawNormal = Array.isArray(params.normal) ? params.normal : null;
        let direction: THREE.Vector3 | null = null;
        if (rawNormal && rawNormal.length === 3 && rawNormal.every((value) => typeof value === "number" && Number.isFinite(value))) {
          direction = new THREE.Vector3(rawNormal[0] as number, rawNormal[1] as number, rawNormal[2] as number);
        } else if (side) {
          // A side of the object's own box, turned the way the object is turned.
          const [x, y, z] = LAY_FLAT_SIDES[side];
          direction = new THREE.Vector3(x, y, z).applyQuaternion(quaternionForShape(reference));
        }
        if (!direction || direction.lengthSq() < 1e-12) throw new Error("lay_flat needs face (bottom/top/left/right/front/back) or a normal [x, y, z]");
        const normal = nearestFaceNormal(reference, direction);
        if (!normal) throw new Error("lay_flat found no face on that object");
        const nextShapes = laidFlatShapes(all, movable, { x: normal.x, y: normal.y, z: normal.z }, placementWorkplaneRef.current);
        commitShapes(nextShapes, movable.map((shape) => shape.id), t("status.laidFlat"));
        const movedIds = new Set(movable.map((shape) => shape.id));
        return {
          normal: [normal.x, normal.y, normal.z].map((value) => Number(value.toFixed(4))),
          objects: nextShapes.filter((shape) => movedIds.has(shape.id)).map(mcpShapeSummary),
        };
      }

      if (command.action === "place_on_face") {
        // The same code as the C key in the view (#195).
        const requestedIds = mcpStringArray(params.ids ?? params.id);
        const ids = new Set(requestedIds.length ? requestedIds : selectedIdsRef.current);
        const all = currentShapes();
        const movable = all.filter((shape) => ids.has(shape.id));
        if (movable.length === 0) throw new Error("place_on_face needs ids or a selection");
        if (movable.some((shape) => shape.locked)) throw new Error("Unlock the objects before moving them");
        const vec3 = (value: unknown) => (Array.isArray(value) && value.length === 3 && value.every((entry) => typeof entry === "number" && Number.isFinite(entry))
          ? new THREE.Vector3(value[0] as number, value[1] as number, value[2] as number)
          : null);
        let point = vec3(params.point);
        let normal = vec3(params.normal);
        if (!point || !normal || normal.lengthSq() < 1e-12) {
          const target = all.find((shape) => shape.id === params.targetId);
          if (!target) throw new Error("place_on_face needs targetId (with targetFace) or point and normal");
          if (ids.has(target.id)) throw new Error("place_on_face cannot set objects down on themselves");
          const side = typeof params.targetFace === "string" && params.targetFace in LAY_FLAT_SIDES ? params.targetFace as LayFlatSide : "top";
          const [x, y, z] = LAY_FLAT_SIDES[side];
          const faceNormal = nearestFaceNormal(target, new THREE.Vector3(x, y, z).applyQuaternion(quaternionForShape(target)));
          if (!faceNormal) throw new Error("place_on_face found no face on that object");
          normal = faceNormal.clone().normalize();
          // The middle of the target, moved out along the normal onto the plane of that face.
          const center = new THREE.Vector3(target.x, (target.elevation ?? 0) + target.height / 2, target.z);
          const reach = Math.max(...meshForShape(target).vertices.map(([vx, vy, vz]) => new THREE.Vector3(vx, vy, vz).dot(normal as THREE.Vector3)));
          point = center.clone().addScaledVector(normal, reach - center.dot(normal));
        }
        const patches = carriedOntoFace(all, [...ids], { point, normal }, movable[0].id);
        const nextShapes = all.map((shape) => {
          const patch = patches.get(shape.id);
          return patch ? canonicalizeShape({ ...shape, ...patch }) : shape;
        });
        commitShapes(nextShapes, movable.map((shape) => shape.id), t("status.carryPlaced", { count: movable.length }));
        return {
          point: [point.x, point.y, point.z].map((value) => Number(value.toFixed(4))),
          normal: [normal.x, normal.y, normal.z].map((value) => Number(value.toFixed(4))),
          objects: nextShapes.filter((shape) => ids.has(shape.id)).map(mcpShapeSummary),
        };
      }

      if (command.action === "align_objects") {
        const axis = params.axis === "x" || params.axis === "y" || params.axis === "z" ? params.axis : null;
        const target = params.target === "min" || params.target === "center" || params.target === "max" ? params.target : null;
        if (!axis || !target) throw new Error("align_objects requires axis x/y/z and target min/center/max");
        const requestedIds = mcpStringArray(params.ids);
        const ids = requestedIds.length ? requestedIds : selectedIdsRef.current;
        const selectedForAlign = currentShapes().filter((shape) => ids.includes(shape.id));
        if (selectedForAlign.length < 2) throw new Error("Select at least two objects to align");
        const validIds = selectedForAlign.map((shape) => shape.id);
        const requestedAnchorId = typeof params.anchorId === "string" ? params.anchorId : null;
        const anchorId = effectiveAlignmentAnchorId(selectedForAlign, requestedAnchorId);
        const { nextShapes, moved } = alignedShapesForSelection(currentShapes(), validIds, selectedForAlign, anchorId, axis, target);
        if (moved === 0) {
          setSelectedIds(validIds);
          selectedIdsRef.current = validIds;
          setNotice(t("status.mcpAligned", { label: alignmentLabel(axis, target) }));
          return {
            moved,
            selectedIds: validIds,
            anchorId,
            objects: selectedForAlign.map(mcpShapeSummary),
          };
        }
        commitShapes(nextShapes, validIds, moved === 1
          ? t("status.mcpAlignedOne", { alignment: alignmentLabel(axis, target) })
          : t("status.mcpAlignedMany", { count: moved, alignment: alignmentLabel(axis, target) }));
        return {
          moved,
          selectedIds: validIds,
          anchorId,
          objects: nextShapes.filter((shape) => validIds.includes(shape.id)).map(mcpShapeSummary),
        };
      }

      if (command.action === "group_objects") {
        const ids = new Set(mcpStringArray(params.ids));
        const groupable = currentShapes().filter((shape) => ids.has(shape.id));
        if (groupable.length < 2) throw new Error("Select at least two objects to group");
        if (groupable.some((shape) => shape.locked)) throw new Error("Unlock every selected object before grouping");
        if (groupable.some((shape) => isNonSolidShapeKind(shape.kind))) throw new Error("A ruler isn't a solid and can't be grouped");
        const sourceFingerprint = projectShapesFingerprint(currentShapes());
        const sourceProjectId = projectInfoRef.current.projectId;
        const result = await buildGroupedShapeFromSelection(groupable, workspaceSettingsRef.current.booleanTriangleLimit);
        if (projectInfoRef.current.projectId !== sourceProjectId || projectShapesFingerprint(currentShapes()) !== sourceFingerprint) {
          throw new Error("The scene changed while grouping; run the command again");
        }
        if (!result.group) {
          if (result.consumed) {
            commitShapes(currentShapes().filter((shape) => !ids.has(shape.id)), null, t("status.mcpGroupConsumed"));
            return { consumed: true, objects: currentShapes().filter((shape) => !ids.has(shape.id)).map(mcpShapeSummary) };
          }
          throw new Error(result.failureNotice);
        }
        const editableGroup = canonicalizeShape({ ...result.group, groupOperation: "group" });
        commitShapes([...currentShapes().filter((shape) => !ids.has(shape.id)), editableGroup], editableGroup.id, t("status.mcpGrouped", { count: groupable.length }));
        return { object: mcpShapeSummary(editableGroup) };
      }

      if (command.action === "bundle_objects") {
        const ids = new Set(mcpStringArray(params.ids));
        const parts = currentShapes().filter((shape) => ids.has(shape.id));
        if (parts.length < 2) throw new Error("Pass at least two objects to bundle");
        if (parts.some((shape) => shape.locked)) throw new Error("Unlock every object before bundling");
        if (parts.some((shape) => isNonSolidShapeKind(shape.kind))) throw new Error("A ruler isn't a solid and can't be bundled");
        const group = groupedShape(parts);
        if (!group) throw new Error("Could not bundle these objects");
        const bundle = canonicalizeShape({ ...group, name: "Bundle", groupOperation: "bundle" });
        commitShapes([...currentShapes().filter((shape) => !ids.has(shape.id)), bundle], bundle.id, t("status.mcpBundled", { count: parts.length }));
        return { object: mcpShapeSummary(bundle) };
      }

      if (command.action === "layer_text") {
        const id = typeof params.id === "string" ? params.id : null;
        const target = id ? currentShapes().find((shape) => shape.id === id) : null;
        if (!target) throw new Error("layer_text needs the id of a text or a layered-text bundle");
        if (target.locked) throw new Error("Unlock the object first");
        if (!offersTextLayers(target)) throw new Error("Only a text, or a bundle made by layer_text, can be layered");
        const stack = textLayerStack(target);
        if (!stack) throw new Error("Could not read the text's layers");
        const wasText = target.kind === "text";
        // A font by name as update_object takes it: a font of one's own becomes its id, a built-in name stays.
        const font = typeof params.font === "string" ? mcpTextFont(params.font) ?? params.font : undefined;
        const source = { ...stack.source, ...(typeof params.text === "string" ? { text: params.text.slice(0, 24) || " " } : {}), ...(font ? { font } : {}) };
        const requested = params.layers !== undefined ? normalizeTextLayers(params.layers) : null;
        if (params.layers !== undefined && !requested) throw new Error("layers must be 1 to 6 entries with grow, height, color and silhouette");
        const badCorner = layerTextLayersError(params.layers);
        if (badCorner) throw new Error(badCorner);
        const layers = requested ?? (wasText ? [...DEFAULT_TEXT_LAYERS] : stack.layers);
        // The key ring hole (#215): left out it stays as the stack has it.
        const keyringArgument = layerTextKeyringArgument(params.keyring);
        if (keyringArgument && "error" in keyringArgument) throw new Error(keyringArgument.error);
        const keyring = keyringArgument ? keyringArgument.keyring : stack.keyring;
        const names = Array.isArray(params.names) ? mcpStringArray(params.names).map((name) => name.trim()).filter(Boolean).slice(0, 100) : [];
        if (names.length) {
          const gap = typeof params.gap === "number" && Number.isFinite(params.gap) ? Math.max(0, params.gap) : 5;
          const probe = layeredTextShape({ ...source, text: names[0] }, layers, [], target.id, target, stack.source.text, keyring);
          const width = shapeWidth(probe);
          const depth = shapeDepth(probe);
          const columns = Math.max(1, Math.round(Math.sqrt((names.length * (depth + gap)) / (width + gap))));
          const offsets = nameTagOffsets(names.length, width, depth, gap, columns);
          const tags = names.map((name, index) => layeredTextShape(
            { ...source, text: name, x: source.x + offsets[index].x, z: source.z + offsets[index].z },
            layers,
            [],
            index === 0 ? target.id : createLocalId("text-tag"),
            { locked: false, hidden: false, name },
            stack.source.text,
            keyring,
          ));
          commitShapes([...currentShapes().filter((shape) => shape.id !== target.id), ...tags], tags.map((tag) => tag.id), t("status.mcpTextTagsMade", { count: tags.length }));
          return { objects: tags.map(mcpShapeSummary) };
        }
        const next = layeredTextShape(source, layers, wasText ? [] : stack.ids, target.id, target, stack.source.text, keyring);
        commitShapes(currentShapes().map((shape) => (shape.id === target.id ? next : shape)), next.id, t("status.mcpTextLayered", { count: layers.length }));
        return { object: mcpShapeSummary(next), layers, keyring };
      }

      if (command.action === "intersect_objects") {
        const ids = new Set(mcpStringArray(params.ids));
        const groupable = currentShapes().filter((shape) => ids.has(shape.id));
        if (groupable.some((shape) => shape.locked)) throw new Error("Unlock every selected object before intersecting");
        if (groupable.some((shape) => isNonSolidShapeKind(shape.kind))) throw new Error("A ruler isn't a solid and can't be intersected");
        if (!canIntersectShapes(groupable)) throw new Error("Pass two solids, or a solid and a hole, to intersect");
        const sourceFingerprint = projectShapesFingerprint(currentShapes());
        const sourceProjectId = projectInfoRef.current.projectId;
        const result = await buildIntersectionShapeFromSelection(groupable, workspaceSettingsRef.current.booleanTriangleLimit);
        if (projectInfoRef.current.projectId !== sourceProjectId || projectShapesFingerprint(currentShapes()) !== sourceFingerprint) {
          throw new Error("The scene changed while intersecting; run the command again");
        }
        if (!result.group && !result.empty) throw new Error(result.failureNotice);
        const remainingShapes = currentShapes().filter((shape) => !ids.has(shape.id));
        if (result.empty) {
          commitShapes(remainingShapes, null, t("status.intersectionEmpty"));
          return { empty: true, objects: remainingShapes.map(mcpShapeSummary) };
        }
        const intersection = canonicalizeShape({ ...result.group!, groupOperation: "intersection" });
        commitShapes([...remainingShapes, intersection], intersection.id, t("status.intersectedMany", { count: groupable.length }));
        return { object: mcpShapeSummary(intersection) };
      }

      if (command.action === "ungroup_objects") {
        const requestedIds = mcpStringArray(params.ids ?? params.id);
        const ids = requestedIds.length ? new Set(requestedIds) : new Set(selectedIdsRef.current);
        const groups = currentShapes().filter((shape) => ids.has(shape.id) && shape.groupedShapes?.length);
        if (groups.length === 0) throw new Error("Select at least one group to ungroup");
        const groupIds = new Set(groups.map((shape) => shape.id));
        const restored = groups.flatMap(restoreGroupedChildren);
        commitShapes([...currentShapes().filter((shape) => !groupIds.has(shape.id)), ...restored], restored.map((shape) => shape.id), groups.length === 1 ? t("status.mcpUngroupedOne") : t("status.mcpUngroupedMany", { count: groups.length }));
        return { objects: restored.map(mcpShapeSummary) };
      }

      if (command.action === "boolean_cut") {
        const solidIds = new Set(mcpStringArray(params.solidIds ?? params.solids));
        const holeIds = new Set(mcpStringArray(params.holeIds ?? params.holes));
        const operandIds = new Set([...solidIds, ...holeIds]);
        const operands = currentShapes()
          .filter((shape) => operandIds.has(shape.id))
          .map((shape) => holeIds.has(shape.id) ? withHoleMode(shape, true) : withHoleMode(shape, false));
        if (!operands.some((shape) => !shape.hole) || !operands.some((shape) => shape.hole)) {
          throw new Error("Provide at least one solidId and one holeId for boolean_cut");
        }
        if (operands.some((shape) => shape.locked)) {
          throw new Error("Unlock every boolean operand before cutting");
        }
        if (operands.some((shape) => isNonSolidShapeKind(shape.kind))) {
          throw new Error("A ruler isn't a solid and can't be a boolean operand");
        }
        const sourceFingerprint = projectShapesFingerprint(currentShapes());
        const sourceProjectId = projectInfoRef.current.projectId;
        const result = await buildGroupedShapeFromSelection(operands, workspaceSettingsRef.current.booleanTriangleLimit);
        if (projectInfoRef.current.projectId !== sourceProjectId || projectShapesFingerprint(currentShapes()) !== sourceFingerprint) {
          throw new Error("The scene changed while cutting; run the command again");
        }
        const remainingShapes = currentShapes().filter((shape) => !operandIds.has(shape.id));
        if (result.consumed) {
          commitShapes(remainingShapes, null, t("status.mcpCutConsumed"));
          return { consumed: true };
        }
        if (!result.group) {
          throw new Error(result.failureNotice);
        }
        const editableGroup = canonicalizeShape({ ...result.group, groupOperation: "group" });
        commitShapes([...remainingShapes, editableGroup], editableGroup.id, t("status.mcpBooleanCut"));
        return { object: mcpShapeSummary(editableGroup) };
      }

      if (command.action === "wrap_around_cylinder") {
        const target = findShape(params.id) ?? (selectedIdsRef.current.length === 1 ? findShape(selectedIdsRef.current[0]) : null);
        if (!target) throw new Error("Select one object to wrap");
        if (target.locked) throw new Error("Unlock the object before wrapping it");
        if (!canWrapAroundCylinder(target)) throw new Error("This object cannot be wrapped; a bundle or a measuring tool has no body of its own");
        const diameter = mcpNumber(params.diameter, Number.NaN);
        if (!Number.isFinite(diameter) || diameter <= 0) throw new Error("diameter must be a positive number of millimetres");
        if (params.inward !== undefined && typeof params.inward !== "boolean") throw new Error("inward must be true or false");
        const inward = params.inward === true;
        const wrapped = cylinderWrappedShape(target, diameter, inward);
        if (typeof wrapped === "string") throw new Error(cylinderWrapErrorText(wrapped, target, diameter));
        commitShapes(
          currentShapes().map((shape) => (shape.id === target.id ? wrapped : shape)),
          [wrapped.id],
          t("status.mcpWrapped"),
        );
        return { object: mcpShapeSummary(wrapped) };
      }

      if (command.action === "simplify_mesh") {
        const target = findShape(params.id) ?? (selectedIdsRef.current.length === 1 ? findShape(selectedIdsRef.current[0]) : null);
        if (!target) throw new Error("Select one object to simplify, or pass its id");
        if (target.locked) throw new Error("Unlock the object before simplifying it");
        const source = target.importedMesh;
        if (!source || target.groupOperation === "bundle") throw new Error("Only an imported mesh or the mesh result of a cut, merge or wrap can be simplified; a shape from the catalogue has its own settings for that");
        const hasPercent = params.keepPercent !== undefined;
        const hasTarget = params.targetTriangles !== undefined;
        if (hasPercent === hasTarget) throw new Error("Pass either keepPercent or targetTriangles");
        const requested = hasPercent
          ? source.triangleCount * mcpNumber(params.keepPercent, Number.NaN) / 100
          : mcpNumber(params.targetTriangles, Number.NaN);
        if (!Number.isFinite(requested) || requested <= 0) throw new Error(hasPercent ? "keepPercent must be a number above 0 and below 100" : "targetTriangles must be a positive number");
        if (Math.round(requested) >= source.triangleCount) throw new Error(`The mesh has ${source.triangleCount} triangles; the target must be below that`);
        const result = await simplifyTrianglePositions(source.positions, requested);
        const simplified = simplifiedMeshShape(target, result.positions);
        if (!simplified) throw new Error("The mesh cannot be simplified any further without changing its form");
        commitShapes(
          currentShapes().map((shape) => (shape.id === target.id ? simplified : shape)),
          [simplified.id],
          t("status.mcpSimplified"),
        );
        return { object: mcpShapeSummary(simplified), trianglesBefore: source.triangleCount, trianglesAfter: result.triangleCount };
      }

      if (command.action === "save_custom_shape") {
        const requested = mcpStringArray(params.ids ?? params.id);
        const ids = requested.length ? requested : selectedIdsRef.current;
        const parts = currentShapes().filter((shape) => ids.includes(shape.id));
        if (parts.length === 0) throw new Error("Pass the ids of the bodies to keep, or select them first");
        if (params.location !== undefined && params.location !== "browser" && params.location !== "server") throw new Error("location must be \"browser\" or \"server\"");
        const servers = await refreshServerShapes();
        if (params.location === "server" && !servers) throw new Error("This installation keeps nothing on the server; save to the browser instead");
        const location: CustomShapeLocation = params.location === "browser" || params.location === "server" ? params.location : servers ? "server" : "browser";
        const fallback = parts.length === 1 ? displayShapeName(parts[0]) : t("myShapes.defaultName");
        const name = myShapeNameFromFile(typeof params.name === "string" ? params.name : "", fallback);
        return { customShape: await saveSelectionAsMyShape(name, parts.map((shape) => shape.id), location) };
      }

      if (command.action === "list_custom_shapes") {
        const [browser, server] = await Promise.all([refreshMyShapes(), refreshServerShapes()]);
        return {
          serverAvailable: server !== null,
          customShapes: [
            ...(server ?? []).map((shape) => ({ id: `server:${shape.fileName}`, name: shape.name, location: "server", byteLength: shape.size, savedAt: new Date(shape.updatedAt).toISOString() })),
            ...browser.map((shape) => ({ id: shape.id, name: shape.name, location: "browser", bodyCount: shape.bodyCount, byteLength: shape.byteLength, savedAt: new Date(shape.createdAt).toISOString() })),
          ],
        };
      }

      if (command.action === "insert_custom_shape" || command.action === "delete_custom_shape") {
        await Promise.all([refreshMyShapes(), refreshServerShapes()]);
        const all = [
          ...(serverShapesRef.current ?? []).map((shape) => ({ id: `server:${shape.fileName}`, name: shape.name })),
          ...myShapesRef.current.map((shape) => ({ id: shape.id, name: shape.name })),
        ];
        const wanted = typeof params.id === "string" ? params.id : typeof params.name === "string" ? params.name : "";
        const byId = all.filter((shape) => shape.id === wanted);
        const found = byId.length ? byId : all.filter((shape) => shape.name.toLowerCase() === wanted.toLowerCase());
        if (found.length === 0) throw new Error(`No custom shape "${wanted}"; layerling_list_custom_shapes lists them`);
        if (found.length > 1) throw new Error(`Several custom shapes are called "${wanted}"; pass the id instead`);
        const entry = found[0];
        if (command.action === "delete_custom_shape") {
          await deleteMyShapeEntry(entry.id);
          return { deleted: entry.id };
        }
        const point = params.x !== undefined || params.z !== undefined
          ? { x: mcpNumber(params.x, 0), y: placementWorkplaneRef.current.origin.y, z: mcpNumber(params.z, 0) }
          : undefined;
        const inserted = await insertMyShape(entry.id, point);
        return { objects: inserted.map(mcpShapeSummary) };
      }

      if (command.action === "separate_parts") {
        const target = findShape(params.id) ?? (selectedIdsRef.current.length === 1 ? findShape(selectedIdsRef.current[0]) : null);
        if (!target) throw new Error("Select one object to separate");
        if (target.locked) throw new Error("Unlock the object before separating parts");
        const parts = separateShapeParts(target);
        if (parts.length <= 1) throw new Error("The selected object has only one connected part");
        commitShapes([...currentShapes().filter((shape) => shape.id !== target.id), ...parts], parts.map((shape) => shape.id), t("status.mcpSeparated", { count: parts.length }));
        return { objects: parts.map(mcpShapeSummary) };
      }

      if (command.action === "split_objects") {
        const requestedIds = mcpStringArray(params.ids);
        const ids = requestedIds.length > 0 ? requestedIds : selectedIdsRef.current;
        const targets = ids.map((id) => findShape(id)).filter((shape): shape is WorkplaneShape => Boolean(shape));
        if (targets.length === 0) throw new Error("No objects to split - pass ids or select solids first");
        if (targets.some((shape) => shape.locked)) throw new Error("A locked object cannot be split - unlock it first");
        if (targets.some((shape) => shape.hidden)) throw new Error("A hidden object cannot be split - show it first");
        if (targets.some((shape) => isNonSolidShapeKind(shape.kind))) throw new Error("A ruler isn't a solid and can't be split");
        const axis = params.axis === undefined ? "y" : splitAxisFromLabel(mcpString(params.axis, ""));
        if (!axis) throw new Error("axis must be x, y or z");
        // Angles come named in the panel's axes (Z up); the one the plane cuts across has nothing to turn.
        if (params[`rotation${splitAxisLabel(axis)}`] !== undefined) throw new Error(`rotation${splitAxisLabel(axis)} turns the plane in place - use the other two axes for an angled ${splitAxisLabel(axis).toLowerCase()} cut`);
        const rotationAxes = splitRotationAxes(axis);
        const rotationAbout = (rotationAxis: AlignAxis) => Math.max(-180, Math.min(180, mcpNumber(params[`rotation${splitAxisLabel(rotationAxis)}`], 0)));
        const rotation: SplitRotation = [rotationAbout(rotationAxes[0]), rotationAbout(rotationAxes[1])];
        const points = targets.flatMap((shape) => meshForShape(shape).vertices);
        const range = modelSplitPlane(points, axis, undefined, rotation);
        if (!range) throw new Error("The objects have no printable geometry to split");
        const requestedPosition = params.position === undefined ? undefined : mcpNumber(params.position, range.position);
        if (requestedPosition !== undefined && (requestedPosition <= range.min || requestedPosition >= range.max)) {
          throw new Error(`position must lie inside the objects, between ${Number(range.min.toFixed(3))} and ${Number(range.max.toFixed(3))}`);
        }
        const plane = modelSplitPlane(points, axis, requestedPosition, rotation) ?? range;
        const sourceFingerprint = projectShapesFingerprint(currentShapes());
        const sourceProjectId = projectInfoRef.current.projectId;
        const outcome = await splitShapesByPlane(
          targets,
          plane,
          () => projectInfoRef.current.projectId === sourceProjectId && projectShapesFingerprint(currentShapes()) === sourceFingerprint,
        );
        if (outcome.status === "stale") throw new Error("The scene changed while splitting; run the command again");
        if (outcome.status === "failed") throw new Error(t("split.error.failed", { name: outcome.shape.name, detail: outcome.error }));
        if (outcome.splitCount === 0) throw new Error("The plane does not cut through any of the objects - move it with position");
        const parts = [...outcome.replacements.values()].flat();
        commitShapes(
          currentShapes().flatMap((shape) => outcome.replacements.get(shape.id) ?? [shape]),
          parts.map((shape) => shape.id),
          outcome.splitCount === 1
            ? t("status.splitOne", { count: parts.length })
            : t("status.splitMany", { count: outcome.splitCount, bodies: parts.length }),
        );
        return {
          axis: splitAxisLabel(axis).toLowerCase(),
          ...Object.fromEntries(rotationAxes.map((rotationAxis, index) => [`rotation${splitAxisLabel(rotationAxis)}`, rotation[index]])),
          position: plane.position,
          min: plane.min,
          max: plane.max,
          splitIds: [...outcome.replacements.keys()],
          objects: parts.map(mcpShapeSummary),
        };
      }

      if (command.action === "list_edges") {
        const target = findShape(params.id);
        if (!target) throw new Error("Object not found");
        invalidateCadModifierSession();
        const sharpAngle = Math.max(1, Math.min(CAD_MODIFIER_MAX_SHARP_ANGLE, mcpNumber(params.sharpAngle, 25)));
        const { response } = await prepareCadModifierForMcp(target, sharpAngle);
        const selectableEdgeIds = response.edges.filter((edge) => selectableCadModifierEdge(edge, sharpAngle)).map((edge) => edge.id);
        return { object: mcpShapeSummary(target), sharpAngle, selectableEdgeIds, edges: response.edges };
      }

      if (command.action === "hollow_object") {
        const target = findShape(params.id);
        if (!target) throw new Error("Object not found");
        if (target.groupOperation === "bundle") throw new Error("A bundle is not one body; group it (layerling_group_objects) or hollow its parts one by one");
        const thickness = Math.max(0.2, mcpNumber(params.thickness, 2));
        // A list of sides, or one of the names the tool had before it took every side.
        const openings: ShellOpenings = Array.isArray(params.openings)
          ? shellOpeningsFor(params.openings.filter((side: unknown): side is ShellSide => SHELL_SIDES.includes(side as ShellSide)))
          : params.openings === "none" || params.openings === "bottom" || params.openings === "top-bottom" ? params.openings : "top";
        const edges: ShellEdges = params.edges === "sharp" ? "sharp" : "round";
        const modifiedShape = await shellShape(target, thickness, openings, edges);
        commitShapes(
          shapesRef.current.map((candidate) => candidate.id === target.id ? modifiedShape : candidate),
          modifiedShape.id,
          t("status.shelledMcp", { size: Number(thickness.toFixed(2)) }),
        );
        return { object: mcpShapeSummary(modifiedShape), thickness, openings, edges };
      }

      if (command.action === "array_objects") {
        const requestedIds = mcpStringArray(params.ids);
        const ids = requestedIds.length > 0 ? requestedIds : selectedIdsRef.current;
        const sources = ids.map((id) => findShape(id)).filter((shape): shape is WorkplaneShape => Boolean(shape));
        if (sources.length === 0) throw new Error("No objects to repeat - pass ids or select something first");
        if (sources.some((shape) => shape.locked)) throw new Error("A locked object cannot be repeated - unlock it first");
        const mode = params.mode === "circle" ? "circle" : "row";
        const direction = params.direction === "y" || params.direction === "z" ? params.direction : "x";
        const bounds = boundsForShapes(sources);
        // spacingX / spacingY / spacingZ step along several axes at once; the
        // older spacing + direction pair still steps along one.
        const perAxis = params.spacingX !== undefined || params.spacingY !== undefined || params.spacingZ !== undefined;
        const spacings = perAxis
          ? { spacingX: mcpNumber(params.spacingX, 0), spacingY: mcpNumber(params.spacingY, 0), spacingZ: mcpNumber(params.spacingZ, 0) }
          : singleAxisSpacing(direction, mcpNumber(params.spacing, bounds.maxX - bounds.minX + 5));
        const settings: ArraySettings = {
          mode,
          count: clampArrayCount(mcpNumber(params.count, 2)),
          ...spacings,
          angle: mcpNumber(params.angle, 360),
          centerX: mcpNumber(params.centerX, 0),
          centerY: mcpNumber(params.centerY, 0),
          rotateCopies: params.rotateCopies !== false,
          rise: mcpNumber(params.rise, 0),
          radiusChange: mcpNumber(params.radiusChange, 0),
        };
        const copies = arrayCopies(sources, settings);
        commitShapes(
          [...shapesRef.current, ...copies],
          [...sources.map((shape) => shape.id), ...copies.map((shape) => shape.id)],
          t("status.arrayCreated", { count: copies.length }),
        );
        return { settings, originals: sources.map((shape) => shape.id), copies: copies.map(mcpShapeSummary) };
      }

      if (command.action === "apply_edge_treatment") {
        const target = findShape(params.id);
        if (!target) throw new Error("Object not found");
        if (isNonSolidShapeKind(target.kind)) throw new Error("A ruler isn't a solid and has no edges to treat");
        return applyCadModifierForMcp(target, params);
      }

      if (command.action === "measure_section") {
        // Wie "Messen" in der Schnittansicht: beide Punkte rasten am Umriss
        // des Schnitts ein, der zweite bevorzugt im rechten Winkel zur Wand.
        const axisParam = params.axis === undefined ? undefined : mcpString(params.axis, "x").toLowerCase();
        if (axisParam !== undefined && axisParam !== "x" && axisParam !== "y" && axisParam !== "z") throw new Error("axis must be x, y or z");
        const current = window.layerlingSectionView?.({}).settings;
        const axis = (axisParam ?? current?.axis ?? "x") as SectionPlaneAxis;
        const offset = params.offset !== undefined
          ? mcpNumber(params.offset, 0)
          : current?.enabled && current.axis === axis
            ? current.offset
            : getSectionBounds(currentShapes(), axis, workspaceSettings.width, workspaceSettings.depth).center;
        const readPoint = (value: unknown, name: string): [number, number, number] => {
          if (!value || typeof value !== "object") throw new Error(`${name} must be an object with x, z and elevation`);
          const point = value as Record<string, unknown>;
          const x = mcpNumber(point.x, axis === "x" ? offset : 0);
          const z = mcpNumber(point.z, axis === "z" ? offset : 0);
          const elevation = mcpNumber(point.elevation, axis === "y" ? offset : 0);
          return [axis === "x" ? offset : x, axis === "y" ? offset : elevation, axis === "z" ? offset : z];
        };
        const radius = Math.max(0, mcpNumber(params.snapRadius, 1));
        const loops = await sectionContours(axis, offset);
        if (loops.length === 0) throw new Error(t("status.sectionSvgMissed"));
        const from = snapSectionPoint(projectSectionPoint(readPoint(params.from, "from"), axis), loops, radius);
        const to = snapSectionPoint(projectSectionPoint(readPoint(params.to, "to"), axis), loops, radius, from.point);
        const measured = sectionMeasurement(from.point, to.point, axis, offset);
        const asEditor = (point: { u: number; v: number }) => {
          const [x, y, z] = sectionPointToWorld(point, axis, offset);
          return { x: Number(x.toFixed(4)), z: Number(z.toFixed(4)), elevation: Number(y.toFixed(4)) };
        };
        return {
          axis,
          offset,
          outlines: loops.length,
          from: { ...asEditor(from.point), snap: from.kind },
          to: { ...asEditor(to.point), snap: to.kind },
          distance: Number(measured.distance.toFixed(4)),
          deltaX: Number(measured.deltaX.toFixed(4)),
          deltaZ: Number(measured.deltaDepth.toFixed(4)),
          deltaElevation: Number(measured.deltaHeight.toFixed(4)),
        };
      }

      if (command.action === "show_overhangs") {
        // Wie "Ueberhaenge zeigen" im Sichtbarkeitsmenue, dazu die Flaechen je Koerper.
        if (params.angle !== undefined) {
          const angle = normalizeOverhangAngle(mcpNumber(params.angle, DEFAULT_OVERHANG_ANGLE));
          updateProjectWorkspaceSettings({ workspace: { ...workspaceSettingsRef.current, overhangAngle: angle }, snap: snapGridRef.current });
        }
        if (typeof params.enabled === "boolean" && params.enabled !== overhangsVisibleRef.current) {
          setOverhangsVisible(params.enabled);
          overhangsVisibleRef.current = params.enabled;
        }
        const angle = workspaceSettingsRef.current.overhangAngle;
        const requestedIds = mcpStringArray(params.ids ?? params.id);
        const solids = currentShapes().filter((shape) => !shape.hidden && !shape.hole && !isNonSolidShapeKind(shape.kind)
          && (requestedIds.length === 0 || requestedIds.includes(shape.id)));
        const objects = solids.map((shape) => {
          const parts = expandBundles([shape]).filter((part) => !part.hole && !part.hidden);
          const mesh = parts.length === 1 ? meshForShape(parts[0]) : (() => {
            const vertices: Vec3[] = [];
            const faces: [number, number, number][] = [];
            parts.forEach((part) => appendMeshData(vertices, faces, meshForShape(part)));
            return { name: shape.name, vertices, faces };
          })();
          const found = overhangArea(mesh.vertices, mesh.faces, angle);
          return {
            id: shape.id,
            name: shape.name,
            overhangAreaMm2: Number(found.areaMm2.toFixed(2)),
            lowestOverhangHeight: found.lowestY === null ? null : Number(found.lowestY.toFixed(3)),
          };
        });
        return {
          enabled: overhangsVisibleRef.current,
          angle,
          objects,
          note: "Faces lying on the plate do not count. A face resting on another body still counts; holes inside groups are already taken off.",
        };
      }

      if (command.action === "add_reference_points") {
        let positions: ReferencePosition[];
        if (Array.isArray(params.points)) {
          positions = params.points.map((entry) => {
            const point = (entry ?? {}) as Record<string, unknown>;
            const x = Number(point.x);
            const z = Number(point.z);
            const y = Number(point.elevation ?? 0);
            if (![x, y, z].every(Number.isFinite)) throw new Error("Each point needs a number for x and z, and optionally for elevation");
            return { x, y, z };
          });
        } else {
          const spot = params.at ?? "center";
          if (spot !== "center" && spot !== "corners" && spot !== "midpoints") throw new Error("at must be center, corners or midpoints");
          const requestedIds = mcpStringArray(params.ids ?? params.id);
          const pickIds = requestedIds.length ? requestedIds : selectedIdsRef.current;
          const targets = currentShapes().filter((shape) => pickIds.includes(shape.id) && !shape.hole);
          if (targets.length === 0) throw new Error("Name the objects to mark with ids, or select some, or pass points");
          const box = unionReferenceBoxes(targets.map(meshAabb));
          if (!box) throw new Error("The objects have no size to mark");
          positions = referencePointsForBox(box, spot);
        }
        if (positions.length === 0) throw new Error("No points given");
        const createdIds = addReferencePoints(positions);
        const created = referencePoints(notesRef.current).filter((point) => createdIds.includes(point.id)).map(mcpPointInfo);
        return {
          added: created.length,
          points: created,
          note: created.length === 0
            ? "Nothing added: these points are already marked, or the design holds as many notes and points as it can."
            : "Points on the top face of the objects (elevation is the height). Shapes snap to them when dragged, and the corner ruler snaps to them.",
        };
      }

      if (command.action === "list_reference_points") {
        return { points: referencePoints(notesRef.current).map(mcpPointInfo) };
      }

      if (command.action === "remove_reference_points") {
        const ids = mcpStringArray(params.ids ?? params.id);
        const current = notesRef.current;
        const targets = referencePoints(current).filter((point) => ids.length === 0 || ids.includes(point.id));
        if (ids.length > 0 && targets.length === 0) throw new Error("No reference point has these ids");
        if (targets.length > 0) commitNotes(current.filter((note) => !targets.includes(note)), t("status.pointRemoved"));
        return { removed: targets.length };
      }

      if (command.action === "estimate_print") {
        // Dieselbe Rechnung wie das Feld "Material" im Exportfenster.
        const requestedIds = mcpStringArray(params.ids ?? params.id);
        const pickIds = requestedIds.length ? requestedIds : selectedIdsRef.current;
        const source = pickIds.length ? currentShapes().filter((shape) => pickIds.includes(shape.id)) : currentShapes();
        if (requestedIds.length && source.length === 0) throw new Error("No matching objects to estimate");
        if (params.material !== undefined && !(PRINT_MATERIALS as readonly unknown[]).includes(params.material)) {
          throw new Error(`material must be one of ${PRINT_MATERIALS.join(", ")}`);
        }
        const material = normalizePrintMaterial(params.material);
        const volume = await exportSolidVolume(source);
        if (volume.solids === 0) throw new Error("Nothing to estimate: no visible solid body");
        const estimate = printEstimate(volume.volumeMm3, material);
        return {
          scope: requestedIds.length ? "ids" : pickIds.length ? "selection" : "design",
          material,
          densityGPerCm3: PRINT_MATERIAL_DENSITY[material],
          filamentDiameterMm: FILAMENT_DIAMETER_MM,
          volumeMm3: Number(estimate.volumeMm3.toFixed(1)),
          volumeCm3: Number(estimate.volumeCm3.toFixed(3)),
          grams: Number(estimate.grams.toFixed(2)),
          filamentMeters: Number(estimate.filamentMeters.toFixed(3)),
          solids: volume.solids,
          bodies: volume.bodies,
          unionFailed: volume.unionFailed,
          note: "Solid, without infill: the slicer shows less with walls and infill.",
        };
      }

      if (command.action === "inspect_errors") {
        return {
          notice: noticeRef.current || t("status.ready"),
          edgeModifierError: edgeModifierRef.current?.error ?? null,
          lastMcpError: lastMcpErrorRef.current,
          recentNotices: reportNoticesRef.current.map((event) => ({ at: new Date(event.at).toISOString(), text: event.text })),
          recentErrors: reportErrorsRef.current.map((event) => ({ at: new Date(event.at).toISOString(), text: event.text })),
        };
      }

      if (command.action === "show_workplane") {
        if (!window.layerlingWorkplaneDisplay) throw new Error("The workplane display is not available in this editor");
        if (params.visible !== undefined && typeof params.visible !== "boolean") throw new Error("visible must be true or false");
        return window.layerlingWorkplaneDisplay(params.visible as boolean | undefined);
      }

      if (command.action === "set_section_view") {
        if (!window.layerlingSectionView) throw new Error("The section view is not available in this editor");
        const axis = params.axis === undefined ? undefined : mcpString(params.axis, "x").toLowerCase();
        if (axis !== undefined && axis !== "x" && axis !== "y" && axis !== "z") throw new Error("axis must be x, y or z");
        const offset = params.offset === undefined ? undefined : mcpNumber(params.offset, 0);
        const result = window.layerlingSectionView({
          ...(typeof params.enabled === "boolean" ? { enabled: params.enabled } : {}),
          ...(axis ? { axis: axis as SectionPlaneAxis } : {}),
          ...(offset !== undefined ? { offset } : {}),
          ...(typeof params.flipped === "boolean" ? { flipped: params.flipped } : {}),
          ...(typeof params.showPlane === "boolean" ? { showPlane: params.showPlane } : {}),
          ...(params.center === true ? { center: true } : {}),
        });
        return result;
      }

      if (command.action === "add_font") {
        const fileName = mcpString(params.fileName, "font.ttf").trim() || "font.ttf";
        if (typeof params.base64 !== "string" || !params.base64) throw new Error("base64 is required: the font file as base64");
        const bytes = Uint8Array.from(atob(params.base64), (char) => char.charCodeAt(0));
        let typeface;
        try {
          typeface = await addCustomFontFile(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, fileName, getManifoldRuntime);
        } catch (error) {
          throw new Error(customFontErrorMessage(error));
        }
        if (params.useOnSelection === true) applyCustomFontToSelection(typeface.id);
        return { id: typeface.id, name: typeface.name, characters: Object.keys(typeface.data.glyphs as object).length };
      }

      if (command.action === "list_fonts") {
        const stored = new Set((await storedCustomFonts().catch(() => [])).map((font) => font.id));
        return {
          builtIn: ["Multilanguage", "Sans", "Serif", "Script", "Monospace", "Rounded", "Stencil"],
          custom: customFontList().map((font) => ({ id: font.id, name: font.name, stored: stored.has(font.id), complete: font.complete })),
        };
      }

      if (command.action === "import_file") {
        // Wie eine Datei im Importfenster: dieselbe Auswertung, dieselben
        // Farben, ZIP und .mtl eingeschlossen.
        const importer = importFilesRef.current;
        if (!importer) throw new Error("The import is not ready yet");
        const fileName = mcpString(params.fileName, "").trim();
        if (!fileName) throw new Error("fileName is required, with its extension (.obj, .stl, .3mf, .step, .svg or .zip)");
        const hasText = typeof params.text === "string";
        const hasBase64 = typeof params.base64 === "string";
        if (hasText === hasBase64) throw new Error("Give the file either as text or as base64");
        const bytes = hasText
          ? new TextEncoder().encode(params.text as string)
          : Uint8Array.from(atob(params.base64 as string), (char) => char.charCodeAt(0));
        const files = [new File([bytes as BlobPart], fileName)];
        if (typeof params.mtl === "string") files.push(new File([params.mtl], fileName.replace(/\.[^.]+$/, "") + ".mtl"));
        const result = await importer(files);
        if (!result.importedIds.length) throw new Error(result.failures.map((failure) => `${failure.fileName}: ${failure.reason}`).join("; ") || "Nothing was imported");
        const imported = currentShapes().filter((shape) => result.importedIds.includes(shape.id));
        return {
          imported: imported.map((shape) => ({ id: shape.id, name: shape.name, color: shape.color, width: shape.width, depth: shape.depth, height: shape.height, x: shape.x, z: shape.z, elevation: shape.elevation ?? 0 })),
          failures: result.failures,
        };
      }

      if (command.action === "export_section_svg") {
        // Ohne Angaben der Schnitt, wie er gerade eingestellt ist; die
        // Schnittansicht selbst bleibt dabei unberuehrt.
        const axisParam = params.axis === undefined ? undefined : mcpString(params.axis, "x").toLowerCase();
        if (axisParam !== undefined && axisParam !== "x" && axisParam !== "y" && axisParam !== "z") throw new Error("axis must be x, y or z");
        const current = window.layerlingSectionView?.({}).settings;
        const axis = (axisParam ?? current?.axis ?? "x") as SectionPlaneAxis;
        const offset = params.offset !== undefined
          ? mcpNumber(params.offset, 0)
          : current?.enabled && current.axis === axis
            ? current.offset
            : getSectionBounds(currentShapes(), axis, workspaceSettings.width, workspaceSettings.depth).center;
        const built = await buildSectionSvg(axis, offset);
        return {
          axis,
          offset,
          seenFrom: SECTION_VIEW_FACE[axis],
          bodies: built.result.bodyCount,
          loops: built.result.loopCount,
          openLoops: built.result.openCount,
          widthMm: Number(built.result.width.toFixed(3)),
          heightMm: Number(built.result.height.toFixed(3)),
          hiddenSkipped: built.hiddenCount,
          svg: built.result.svg,
        };
      }

      if (command.action === "set_workplane") {
        // Wie W und ein Klick auf eine Flaeche: eine Seite des eigenen Rahmens
        // des Koerpers, eingerastet auf die echte Flaeche, die Ebene in ihrer Mitte.
        let placed: PlacementWorkplane | null = null;
        if (typeof params.id === "string") {
          const target = shapesRef.current.find((shape) => shape.id === params.id);
          if (!target) throw new Error(`No object with id ${params.id}`);
          if (target.hidden) throw new Error("Show the object before setting the workplane on it");
          const side = typeof params.face === "string" ? params.face : "top";
          if (!(side in LAY_FLAT_SIDES)) throw new Error("face must be top, bottom, left, right, front or back");
          const quaternion = quaternionForShape(target);
          const [sx, sy, sz] = LAY_FLAT_SIDES[side as LayFlatSide];
          const normal = nearestFaceNormal(target, new THREE.Vector3(sx, sy, sz).applyQuaternion(quaternion)) ?? new THREE.Vector3(sx, sy, sz).applyQuaternion(quaternion);
          const { vertices } = meshForShape(target);
          const reach = vertices.reduce((most, v) => Math.max(most, v[0] * normal.x + v[1] * normal.y + v[2] * normal.z), Number.NEGATIVE_INFINITY);
          const onFace = vertices.filter((v) => v[0] * normal.x + v[1] * normal.y + v[2] * normal.z >= reach - 1e-3);
          const origin = onFace.reduce((sum, v) => ({ x: sum.x + v[0] / onFace.length, y: sum.y + v[1] / onFace.length, z: sum.z + v[2] / onFace.length }), { x: 0, y: 0, z: 0 });
          const tangent = new THREE.Vector3(side === "left" || side === "right" ? 0 : 1, 0, side === "left" || side === "right" ? 1 : 0).applyQuaternion(quaternion);
          placed = placementWorkplaneFromSurface(origin, { x: normal.x, y: normal.y, z: normal.z }, { x: tangent.x, y: tangent.y, z: tangent.z }, params.flip === true, true);
          setActivePlacementWorkplane(placed, "shape");
        }
        if (params.reset === true) setActivePlacementWorkplane(horizontalPlacementWorkplane(), "base");
        const current = params.reset === true ? horizontalPlacementWorkplane() : placed ?? placementWorkplaneRef.current;
        const onBase = placementWorkplaneIsBase(current);
        if (typeof params.visible === "boolean") {
          if (onBase && !params.visible) throw new Error("The workplane is the base plate; only a workplane set on a face can be hidden");
          setWorkplaneHidden(!params.visible);
          workplaneHiddenRef.current = !params.visible;
          setNotice(params.visible ? t("status.workplaneShown") : t("status.workplaneHidden"));
        }
        return { onBase, hidden: !onBase && workplaneHiddenRef.current, origin: current.origin, normal: current.normal };
      }

      if (command.action === "capture_image") {
        const face = mcpString(params.face, "current") as LayerlingMcpViewFace;
        const clean = params.clean === true || typeof params.plate === "boolean" || typeof params.transparent === "boolean";
        let image = await (window.layerlingCaptureView?.(face) ?? window.layerlingCaptureCanvas?.() ?? "");
        // The same clean picture the PNG export saves: only the bodies, the camera already turned to `face`.
        if (clean) image = window.layerlingCaptureImage?.({ plate: params.plate !== false, transparent: params.transparent === true }) ?? "";
        if (!image || image.length < 100) {
          throw new Error("The Layerling viewport did not return an image");
        }
        return { face, clean, dataUrl: image, bytesApprox: Math.floor(image.length * 0.75) };
      }

      throw new Error(`Unknown MCP command: ${command.action}`);
    } catch (error) {
      const message = error instanceof Error ? localizedError(error.message) : String(error);
      lastMcpErrorRef.current = message;
      reportErrorsRef.current = rememberBugReportEvent(reportErrorsRef.current, `MCP ${command.action}: ${message}`);
      setNotice(message);
      throw error;
    }
  }, [
    buildSectionSvg,
    rebuildSketchBodyFill,
    applyCustomFontToSelection,
    addReferencePoints,
    commitNotes,
    workspaceSettings.width,
    workspaceSettings.depth,
    applyCadModifierForMcp,
    cancelOpenGroup,
    commitShapes,
    finishOpenGroup,
    initialSnap,
    openGroupForEditing,
    invalidateCadModifierSession,
    mcpSceneSnapshot,
    placementElevation,
    prepareCadModifierForMcp,
    setActivePlacementWorkplane,
    updateProjectWorkspaceSettings,
    sectionContours,
    closeHistoryView,
    openHistoryView,
    deleteMyShapeEntry,
    insertMyShape,
    refreshMyShapes,
    refreshServerShapes,
    saveSelectionAsMyShape,
  ]);

  useEffect(() => {
    executeMcpCommandRef.current = executeMcpCommand;
  }, [executeMcpCommand]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const localDevelopment = process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
    // The static export has no bridge. A copy somebody hosts themselves (a NAS, the Docker image) has one only
    // when its server switched remote use on (LAYERLING_MCP_REMOTE and LAYERLING_MCP_TOKEN); it says so itself.
    if (!localDevelopment && process.env.NEXT_PUBLIC_STATIC_EXPORT === "true") {
      return;
    }

    let cancelled = false;
    let stopBridge: (() => void) | null = null;
    const startBridge = () => {
      const identity = readMcpEditorIdentity();
      let stopped = false;
      let polling = false;
      let pollAbortController: AbortController | null = null;
      let pollRetryTimer: number | null = null;

      const heartbeat = () => {
        const projectInfo = projectInfoRef.current;
        const currentShapes = shapesRef.current;
        void fetch(LAYERLING_MCP_ROUTE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "heartbeat",
            editor: {
              ...identity,
              projectId: projectInfo.projectId,
              projectName: projectInfo.projectName,
              url: window.location.href,
              focused: document.visibilityState === "visible" && document.hasFocus(),
              shapeCount: currentShapes.length,
              selectedCount: selectedIdsRef.current.length,
              notice: noticeRef.current || t("status.ready"),
              lastError: edgeModifierRef.current?.error ?? lastMcpErrorRef.current,
            },
          }),
        }).catch(() => undefined);
      };

      const submitResult = (commandId: string, ok: boolean, data?: unknown, error?: string) => {
        void fetch(LAYERLING_MCP_ROUTE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "result",
            editorId: identity.editorId,
            result: { commandId, ok, data, error, completedAt: Date.now() },
          }),
        }).catch(() => undefined);
      };

      const poll = async () => {
        if (polling || stopped) return;
        polling = true;
        let retry = false;
        pollAbortController = new AbortController();
        try {
          const response = await fetch(LAYERLING_MCP_ROUTE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "poll", editorId: identity.editorId }),
            signal: pollAbortController.signal,
          });
          if (!response.ok) throw new Error(`Layerling MCP poll returned HTTP ${response.status}`);
          const payload = (await response.json().catch(() => null)) as { command?: LayerlingMcpCommand | null } | null;
          const command = payload?.command;
          if (command) {
            try {
              const data = await executeMcpCommandRef.current?.(command);
              submitResult(command.id, true, data);
            } catch (error) {
              submitResult(command.id, false, undefined, error instanceof Error ? localizedError(error.message) : String(error));
            }
          }
        } catch (error) {
          // The local bridge may not exist while static builds or tests render the editor.
          retry = !stopped && (!(error instanceof DOMException) || error.name !== "AbortError");
        } finally {
          pollAbortController = null;
          polling = false;
          if (!stopped) {
            if (retry) {
              pollRetryTimer = window.setTimeout(() => {
                pollRetryTimer = null;
                void poll();
              }, LAYERLING_MCP_POLL_RETRY_MS);
            } else {
              void poll();
            }
          }
        }
      };

      heartbeat();
      void poll();
      const heartbeatTimer = window.setInterval(heartbeat, LAYERLING_MCP_HEARTBEAT_MS);
      window.addEventListener("focus", heartbeat);
      document.addEventListener("visibilitychange", heartbeat);
      stopBridge = () => {
        stopped = true;
        window.clearInterval(heartbeatTimer);
        if (pollRetryTimer !== null) window.clearTimeout(pollRetryTimer);
        pollAbortController?.abort();
        window.removeEventListener("focus", heartbeat);
        document.removeEventListener("visibilitychange", heartbeat);
      };
    };

    if (localDevelopment) {
      startBridge();
    } else {
      void fetch(`${LAYERLING_MCP_ROUTE}?status=1`)
        .then((response) => (response.ok ? response.json() : null))
        .then((payload: { remote?: boolean } | null) => {
          if (!cancelled && payload?.remote === true) startBridge();
        })
        .catch(() => undefined);
    }

    return () => {
      cancelled = true;
      stopBridge?.();
    };
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" || typeof window === "undefined") {
      return;
    }
    if (!["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const caseId = params.get("codexBooleanCase");
    if (!caseId) {
      return;
    }

    const modeParam = params.get("codexBooleanMode");
    const mode: BooleanAutomationMode = modeParam === "before" || modeParam === "ungroup" ? modeParam : "after";
    const runKey = `${caseId}:${mode}`;
    if (booleanAutomationRunRef.current === runKey) {
      return;
    }
    booleanAutomationRunRef.current = runKey;
    document.body.dataset.codexBooleanTestDone = "running";
    delete document.body.dataset.codexBooleanTestResult;
    delete document.body.dataset.codexBooleanTestImageReady;
    delete document.body.dataset.codexBooleanTestScreenshotPath;

    const finish = (detail: BooleanAutomationResult) => {
      window.__layerlingBooleanTest = detail;
      const captureCanvas = () => {
        try {
          const canvas = document.querySelector("canvas") as HTMLCanvasElement | null;
          const image = window.layerlingCaptureCanvas?.() ?? canvas?.toDataURL("image/png") ?? "";
          if (image.length > 100) {
            window.__layerlingBooleanTestImage = image;
            document.body.dataset.codexBooleanTestImageReady = "true";
            void fetch("/api/codex-screenshot", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: `boolean-${detail.caseId}-${detail.mode}.png`, dataUrl: image }),
            })
              .then((response) => (response.ok ? response.json() : null))
              .then((payload: { path?: string } | null) => {
                if (payload?.path) {
                  document.body.dataset.codexBooleanTestScreenshotPath = payload.path;
                }
              })
              .catch(() => {
                document.body.dataset.codexBooleanTestImageReady = "false";
              });
          }
        } catch {
          document.body.dataset.codexBooleanTestImageReady = "false";
        }
      };
      const publish = () => {
        document.body.dataset.codexBooleanTestDone = detail.ok ? "true" : "false";
        document.body.dataset.codexBooleanTestResult = JSON.stringify(detail);
        window.dispatchEvent(new CustomEvent("layerling:boolean-test-done", { detail }));
      };
      publish();
      window.setTimeout(publish, 100);
      window.setTimeout(captureCanvas, 1000);
      window.setTimeout(captureCanvas, 1800);
    };

    const run = async () => {
      const testCase = booleanAutomationScene(caseId);
      if (!testCase) {
        finish({
          ok: false,
          caseId,
          label: "Unknown boolean test",
          mode,
          notice: "Unknown boolean automation case",
          shapeCount: 0,
          selectedCount: 0,
          error: `Unknown boolean automation case: ${caseId}`,
        });
        return;
      }

      const ids = testCase.shapes.map((shape) => shape.id);
      if (mode === "before") {
        const noticeText = `Boolean test before: ${testCase.label}`;
        commitShapes(testCase.shapes, ids, noticeText);
        finish({
          ok: true,
          caseId,
          label: testCase.label,
          mode,
          notice: noticeText,
          shapeCount: testCase.shapes.length,
          selectedCount: ids.length,
        });
        return;
      }

      const result = await buildGroupedShapeFromSelection(testCase.shapes, workspaceSettingsRef.current.booleanTriangleLimit);
      if (!result.group) {
        const noticeText = result.consumed ? t("status.groupedHoleConsumed") : result.failureNotice;
        commitShapes(result.consumed ? [] : testCase.shapes, result.consumed ? [] : ids, noticeText);
        finish({
          ok: result.consumed,
          caseId,
          label: testCase.label,
          mode,
          notice: noticeText,
          shapeCount: result.consumed ? 0 : testCase.shapes.length,
          selectedCount: result.consumed ? 0 : ids.length,
          error: result.consumed ? undefined : result.failureNotice,
        });
        return;
      }

      const triangleCount = result.group.importedMesh?.triangleCount ?? meshForShape(result.group).faces.length;
      const groupedCount = result.group.groupedShapes?.length ?? 0;
      if (mode === "ungroup") {
        const restored = restoreGroupedChildren(result.group);
        const noticeText = `Boolean test ungrouped: ${testCase.label}`;
        commitShapes(restored, restored.map((shape) => shape.id), noticeText);
        finish({
          ok: restored.length === groupedCount,
          caseId,
          label: testCase.label,
          mode,
          notice: noticeText,
          shapeCount: restored.length,
          selectedCount: restored.length,
          triangleCount,
          groupedCount,
          groupId: result.group.id,
        });
        return;
      }

      const noticeText = `Boolean test after: ${testCase.label}`;
      commitShapes([result.group], result.group.id, noticeText);
      finish({
        ok: true,
        caseId,
        label: testCase.label,
        mode,
        notice: noticeText,
        shapeCount: 1,
        selectedCount: 1,
        triangleCount,
        groupedCount,
        groupId: result.group.id,
      });
    };

    void run();
  }, [commitShapes]);

  /** The view as a picture, from the viewport's own clean capture. */
  const exportViewImage = useCallback(async (exportName: string, options: ViewImageOptions) => {
    const dataUrl = window.layerlingCaptureImage?.(options) ?? "";
    const comma = dataUrl.indexOf(",");
    if (!dataUrl.startsWith("data:image/png") || comma < 0) {
      setNotice(t("status.imageFailed"), true);
      return;
    }
    const binary = atob(dataUrl.slice(comma + 1));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    await downloadBlobFile(projectExportFileName(exportName, "png"), new Blob([bytes], { type: "image/png" }));
    setTopPanel(null);
    setNotice(t("status.imageSaved"));
  }, [setNotice]);

  /**
   * Was ein Export mitnimmt: im Verlaufsblick den gezeigten Stand, sonst die
   * Auswahl oder alles. `selection` sagt, ob die Saetze von einer Auswahl
   * sprechen sollen.
   */
  const exportSource = useCallback(() => {
    const view = historyViewStateRef.current;
    if (view) return { shapes: view.shapes, selection: false };
    return { shapes: hasSelection ? selectedShapes : shapes, selection: hasSelection };
  }, [hasSelection, selectedShapes, shapes]);

  const exportDesign = useCallback((format: DirectExportFormat, exportName: string) => {
    const source = exportSource();
    const selectionScoped = source.selection;
    // Ausgeblendetes bleibt draussen, wie bei Tinkercad: ein beiseitegelegtes
    // Teil soll nicht unbemerkt mitgedruckt werden (Discussion #80).
    const { visible: sourceShapes, hiddenNote } = visibleExportShapes(source.shapes);
    const exportable = sourceShapes.filter((shape) => !shape.hole && !isNonSolidShapeKind(shape.kind));
    if (exportable.length === 0) {
      setNotice(hiddenNote ? t("status.exportOnlyHidden") : selectionScoped ? t("status.selectSolidBeforeExport") : t("status.addSolidBeforeExport"));
      return;
    }
    const invalidSvg = exportable.map(invalidSvgMeshReason).find((reason): reason is string => Boolean(reason));
    if (invalidSvg) {
      setNotice(t("status.svgInvalid", { reason: invalidSvg }), true);
      return;
    }
    const selectedNotice = exportable.length === 1
      ? t("status.exportedSelectedOne")
      : t("status.exportedSelectedMany", { count: exportable.length });
    const finishNotice = (label: string) => {
      setTopPanel(null);
      setNotice((selectionScoped
        ? t("status.exportedSelectedAs", { selected: selectedNotice, label })
        : t("status.exportedAs", { label })) + hiddenNote);
    };
    const failNotice = (label: string, error: unknown) => {
      setNotice(error instanceof Error ? localizedError(error.message) : t("status.exportFailed", { label }));
    };
    if (format === "svg") {
      setNotice(t("status.buildingSvg"), true);
      void exportBodiesWithLooseHoles(sourceShapes)
        .then(({ solids: cutSolids, meshes, cut }) => toSvg(cutSolids, exportName.trim() || projectName, meshes.map((mesh, index) => (cut[index] ? mesh : null))))
        .then((content) => downloadTextFile(projectExportFileName(exportName, "svg"), content, "image/svg+xml;charset=utf-8"))
        .then(() => finishNotice("SVG"))
        .catch((error: unknown) => failNotice("SVG", error));
      return;
    }
    const label = format === "stl" ? "STL" : format === "3mf" ? "3MF" : "OBJ";
    // Loose holes cut the bodies they reach first (#203); a body cut away entirely drops out.
    let bodiesWritten: WorkplaneShape[] = exportable;
    // A group showing its parts in their own colours keeps them in 3MF and OBJ (#153).
    const partFaceColors = (mesh: MeshData, sourceIndex: number) => {
      const source = bodiesWritten[sourceIndex];
      const solids = source ? multicolorExportSolids(source) : null;
      if (!source || !solids) return undefined;
      const colors = exportFaceColors(mesh, solids, source.color);
      solids.forEach(({ probe }) => {
        disposeBoundsTree.call(probe.geometry);
        probe.geometry.dispose();
        (probe.material as THREE.Material).dispose();
      });
      return colors;
    };
    void exportBodiesWithLooseHoles(sourceShapes)
      .then(async ({ solids: cutSolids, meshes, holeCutsFailed }) => {
        bodiesWritten = cutSolids;
        const joined = await (format === "stl" ? unionOverlappingExportMeshes(cutSolids, meshes) : colorSeparatedExportMeshes(cutSolids, meshes));
        return { ...joined, gescheitert: joined.gescheitert + holeCutsFailed };
      })
      .then(async ({ meshes: fertig, quellen, verschmolzen, gescheitert }) => {
        if (format === "stl") {
          await downloadBlobFile(projectExportFileName(exportName, "stl"), new Blob([exportMeshesToStl(fertig)], { type: "model/stl" }));
        } else if (format === "3mf") {
          const bodies = fertig.map((mesh, index) => {
            const source = bodiesWritten[quellen[index]];
            return { ...mesh, name: source?.name || mesh.name, color: source?.color, faceColors: partFaceColors(mesh, quellen[index]) };
          });
          const bytes = exportMeshesTo3mf(bodies, { title: exportName.trim() || projectName });
          await downloadBlobFile(projectExportFileName(exportName, "3mf"), new Blob([bytes as BlobPart], { type: THREE_MF_MEDIA_TYPE }));
        } else {
          const bodies = fertig.map((mesh, index) => ({ ...mesh, color: bodiesWritten[quellen[index]]?.color, faceColors: partFaceColors(mesh, quellen[index]) }));
          await downloadTextFile(projectExportFileName(exportName, "obj"), exportMeshesToObj(bodies), "text/plain");
        }
        // The file is written either way; the notice below only adds a caveat.
        setTopPanel(null);
        const exportOverhangs = bedPrinter ? bedOverhangs(exportable, bedPrinter.width, bedPrinter.depth, bedPrinter.height) : [];
        if (gescheitert > 0) setNotice(t("status.exportUnionFailed"), true);
        else if (bedPrinter && exportOverhangs.length > 0) setNotice(bedOverhangMessage(exportOverhangs, `${bedPrinter.vendor} ${bedPrinter.model}`), true);
        else if (verschmolzen > 0) setNotice(t("status.exportUnioned", { count: verschmolzen, label }) + hiddenNote);
        else finishNotice(label);
      })
      .catch((error: unknown) => failNotice(label, error));
  }, [bedPrinter, exportSource, projectName]);

  const exportStepDesign = useCallback(async (exportName: string) => {
    if (stepExporting) {
      return;
    }
    const { visible: sourceShapes, hiddenNote } = visibleExportShapes(exportSource().shapes);
    if (sourceShapes.length === 0 && hiddenNote) {
      setNotice(t("status.exportOnlyHidden"));
      return;
    }
    if (sourceShapes.some((shape) => shape.hole) && !sourceShapes.some((shape) => !shape.hole)) {
      setNotice(t("status.selectSolidForStep"));
      return;
    }
    setStepExporting(true);
    setNotice(t("status.buildingBrep"), true);
    try {
      const { exportShapesToStep } = await import("@/lib/stepExport");
      const { blob, exportedCount, skipped } = await exportShapesToStep(sourceShapes);
      const text = await blob.text();
      await downloadTextFile(projectExportFileName(exportName, "step"), text, "application/step");
      setTopPanel(null);
      if (skipped.length > 0) console.info("layerling: STEP export skipped", skipped);
      // Name what was left out and why, so it is not missed (#184).
      const named = skipped.slice(0, 3).map((entry) => t("status.exportStepSkippedItem", { name: entry.name, reason: t(`status.exportStepSkip.${entry.code}`) }));
      const more = skipped.length > 3 ? t("status.exportStepSkippedMore", { count: skipped.length - 3 }) : "";
      const skipNote = skipped.length === 0 ? "" : t("status.exportStepSkippedList", { list: named.join(", ") + more });
      setNotice((exportedCount === 1
        ? t("status.exportedStepOne", { skipNote })
        : t("status.exportedStepMany", { count: exportedCount, skipNote })) + hiddenNote);
    } catch (error: unknown) {
      // Dass nichts dabei ist, was STEP tragen kann, ist keine Stoerung -
      // dafuer gibt es einen Satz, der sagt, woran es liegt.
      if (error instanceof Error && error.name === "StepExportEmptyError") {
        setNotice(t("status.exportStepNothing"), true);
        return;
      }
      setNotice(error instanceof Error ? localizedError(error.message) : t("status.exportStepFailed"));
    } finally {
      setStepExporting(false);
    }
  }, [exportSource, projectName, stepExporting]);

  const exportLylDesign = useCallback(async (exportName: string, historyLimit: LylHistoryLimit, target: LylExportTarget = "download") => {
    if (lylExporting) return;
    if (target === "shared" && !onSaveSharedProject) {
      setNotice(t("status.sharedUnavailable"), true);
      return;
    }
    if (projectInteractionActiveRef.current) {
      setNotice(t("status.finishBeforeSave"));
      return;
    }
    setLylExporting(true);
    setNotice(target === "shared" ? t("status.packagingShared") : t("status.packagingProject"));
    try {
      const thumbnailDataUrl = target === "shared"
        ? await (window.layerlingCaptureCanvasAsync?.() ?? Promise.resolve(""))
        : "";
      if (target === "shared" && (!thumbnailDataUrl.startsWith("data:image/png;base64,") || thumbnailDataUrl.length <= 100)) {
        throw new Error("Could not capture the current project preview");
      }
      // Im Verlaufsblick geht der gezeigte Stand in die Datei, mit dem Verlauf
      // bis zu ihm - was danach kam, gehoert nicht zu diesem Stand.
      const view = historyViewStateRef.current;
      const exportedHistory = view
        ? editorHistoryBranch(historyRef.current, view.index, historyLimit)
        : editorHistoryForExport(historyRef.current, historyIndexRef.current, historyLimit);
      const bytes = await exportLylProject({
        projectId: projectInfoRef.current.projectId,
        projectName,
        createdAt: projectCreatedAt,
        modifiedAt: projectModifiedAt,
        shapes: view ? view.shapes : shapesRef.current,
        notes: view ? view.notes : notesRef.current,
        history: exportedHistory.entries,
        historyIndex: exportedHistory.index,
        assets: projectAssetsRef.current,
        workspace: workspaceSettingsRef.current,
        snapGrid,
        placementElevation: view ? view.placementElevation : placementElevation,
        placementWorkplane: view ? view.placementWorkplane : placementWorkplane,
        sketchPlacementWorkplane: view ? view.placementWorkplane : placementWorkplane,
      });
      if (target === "shared" && onSaveSharedProject) {
        setNotice(await onSaveSharedProject({ exportName: exportName.trim() || projectName, bytes, thumbnailDataUrl }));
      } else {
        const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
        await downloadBlobFile(projectExportFileName(exportName, "lyl"), new Blob([buffer], { type: LYL_MEDIA_TYPE }));
        setNotice(t("status.savedProject"));
      }
      setTopPanel(null);
    } catch (error) {
      setNotice(error instanceof Error ? localizedError(error.message) : t("status.saveProjectFailed"));
    } finally {
      setLylExporting(false);
    }
  }, [onSaveSharedProject, placementElevation, placementWorkplane, projectCreatedAt, projectModifiedAt, projectName, lylExporting, snapGrid]);

  /** Der Entwurf als .lyl samt einer Textdatei, die sagt, wo und womit es passiert ist. */
  const saveBugReport = useCallback(async () => {
    if (projectInteractionActiveRef.current) {
      setNotice(t("status.finishBeforeSave"));
      return;
    }
    setNotice(t("status.bugReportBuilding"), true);
    try {
      const currentShapes = shapesRef.current;
      const shapeKinds: Record<string, number> = {};
      currentShapes.forEach((shape) => {
        const kind = shape.groupedShapes?.length ? "group" : shape.kind;
        shapeKinds[kind] = (shapeKinds[kind] ?? 0) + 1;
      });
      let webgl = "";
      try {
        const gl = document.createElement("canvas").getContext("webgl");
        const debug = gl?.getExtension("WEBGL_debug_renderer_info");
        webgl = gl ? String(gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER)) : "no WebGL";
      } catch {
        webgl = "unknown";
      }
      const workplane = placementWorkplaneRef.current;
      const lastMcpError = lastMcpErrorRef.current;
      const text = bugReportText({
        version: LYL_CREATED_WITH_VERSION,
        createdAt: Date.now(),
        language: editorLanguage,
        userAgent: navigator.userAgent,
        screen: { width: window.screen.width, height: window.screen.height, pixelRatio: window.devicePixelRatio },
        viewport: { width: window.innerWidth, height: window.innerHeight },
        touch: navigator.maxTouchPoints > 0,
        webgl,
        unit: lengthDisplayUnit(workspaceSettingsRef.current).label,
        printer: printerPresetById(workspaceSettingsRef.current.printer)?.model ?? "",
        shapeCount: currentShapes.length,
        shapeKinds,
        selectedCount: selectedIdsRef.current.length,
        workplane: placementWorkplaneIsBase(workplane)
          ? "base plate"
          : `on a face, origin ${[workplane.origin.x, workplane.origin.y, workplane.origin.z].map((v) => v.toFixed(2)).join(", ")}, normal ${[workplane.normal.x, workplane.normal.y, workplane.normal.z].map((v) => v.toFixed(3)).join(", ")}${workplaneHiddenRef.current ? ", hidden" : ""}`,
        openGroup: openGroupsRef.current.length > 0,
        sketchActive,
        notices: reportNoticesRef.current,
        errors: lastMcpError && !reportErrorsRef.current.some((event) => event.text.includes(lastMcpError))
          ? rememberBugReportEvent(reportErrorsRef.current, lastMcpError)
          : reportErrorsRef.current,
      });
      const exportedHistory = editorHistoryForExport(historyRef.current, historyIndexRef.current, "unlimited");
      const bytes = await exportLylProject({
        projectId: projectInfoRef.current.projectId,
        projectName,
        createdAt: projectCreatedAt,
        modifiedAt: projectModifiedAt,
        shapes: currentShapes,
        notes: notesRef.current,
        history: exportedHistory.entries,
        historyIndex: exportedHistory.index,
        assets: projectAssetsRef.current,
        workspace: workspaceSettingsRef.current,
        snapGrid,
        placementElevation,
        placementWorkplane,
        sketchPlacementWorkplane: placementWorkplane,
        extraFiles: { [BUG_REPORT_FILE]: new TextEncoder().encode(text) },
      });
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      await downloadBlobFile(projectExportFileName(`${projectName}-${t("bugReport.fileSuffix")}`, "lyl"), new Blob([buffer], { type: LYL_MEDIA_TYPE }));
      setNotice(t("status.bugReportSaved"), true);
    } catch (error) {
      setNotice(error instanceof Error ? localizedError(error.message) : t("status.saveProjectFailed"));
    }
  }, [editorLanguage, placementElevation, placementWorkplane, projectCreatedAt, projectModifiedAt, projectName, setNotice, sketchActive, snapGrid]);

  /**
   * A project opened from the server keeps working on the fast local copy, and
   * the server copy is brought up to date by itself.
   *
   * Not on every change: packing a project means zipping and hashing all of it,
   * which is what made large designs stutter before. It happens once the work
   * pauses, and again when the editor is left. A drag in progress postpones it
   * rather than interrupting it, and the history that travels is whatever the
   * workspace limit has already trimmed the in-memory history to.
   */
  const SERVER_SAVE_IDLE_MS = 5000;
  /** So bald wird es wieder versucht, wenn der Weg gerade belegt war. */
  const SERVER_SAVE_BUSY_MS = 900;
  const serverSaveTimerRef = useRef<number | null>(null);
  const serverSavePendingRef = useRef(false);
  const serverSaveRunningRef = useRef(false);
  const serverSaveStoppedRef = useRef(false);
  const serverSaveProjectRef = useRef<string | null>(null);
  /**
   * Der Stand, der auf dem Server liegt - daran haengt, ob es etwas zu tun gibt.
   * Er wird beim Laden des Entwurfs gesetzt, nicht erst, wenn die Bindung an die
   * Serverdatei eintrifft: Die kommt bei einem frisch angelegten Entwurf spaeter,
   * und was bis dahin gebaut wurde, galt sonst als der gespeicherte Stand.
   */
  const serverSavedFingerprintRef = useRef<{ projectId: string | null; fingerprint: string } | null>(null);

  /**
   * Noch einmal ansetzen. Wer hier vorbeikommt, hat etwas zu speichern, konnte
   * aber gerade nicht - ein Upload lief noch, oder es wurde gezogen. Ohne
   * diesen zweiten Anlauf bliebe die Aenderung liegen, bis zufaellig die
   * naechste kommt: Genau so verschwand der erste Koerper in einem frisch
   * angelegten Serverentwurf, weil der Klick aufs Haus in den Upload der
   * leeren Datei fiel.
   */
  const scheduleServerSaveRetry = useCallback((delay: number) => {
    if (serverSaveTimerRef.current !== null) window.clearTimeout(serverSaveTimerRef.current);
    serverSaveTimerRef.current = window.setTimeout(() => {
      serverSaveTimerRef.current = null;
      void saveToServerRef.current();
    }, delay);
  }, []);

  const saveToServerNow = useCallback(async () => {
    if (!serverFileName || !onSaveSharedProject) return;
    if (serverSaveStoppedRef.current || !serverSavePendingRef.current) return;
    if (serverSaveRunningRef.current || projectInteractionActiveRef.current) {
      scheduleServerSaveRetry(SERVER_SAVE_BUSY_MS);
      return;
    }
    serverSaveRunningRef.current = true;
    serverSavePendingRef.current = false;
    try {
      const thumbnailDataUrl = await (window.layerlingCaptureCanvasAsync?.() ?? Promise.resolve(""));
      if (!thumbnailDataUrl.startsWith("data:image/png;base64,") || thumbnailDataUrl.length <= 100) {
        // No preview to be had yet - keep the change pending for the next round.
        serverSavePendingRef.current = true;
        scheduleServerSaveRetry(SERVER_SAVE_BUSY_MS);
        return;
      }
      const exportedHistory = editorHistoryForExport(historyRef.current, historyIndexRef.current, "unlimited");
      const bytes = await exportLylProject({
        projectId: projectInfoRef.current.projectId,
        projectName,
        createdAt: projectCreatedAt,
        modifiedAt: Date.now(),
        shapes: shapesRef.current,
        notes: notesRef.current,
        history: exportedHistory.entries,
        historyIndex: exportedHistory.index,
        assets: projectAssetsRef.current,
        workspace: workspaceSettingsRef.current,
        snapGrid,
        placementElevation,
        placementWorkplane,
        sketchPlacementWorkplane: placementWorkplane,
      });
      await onSaveSharedProject({ exportName: projectName, bytes, thumbnailDataUrl, targetFileName: serverFileName });
      setNotice(t("status.serverSaved"));
    } catch (error) {
      const conflict = Boolean((error as Error & { conflict?: boolean }).conflict);
      if (conflict) {
        // Somebody else changed the file. Carrying on would overwrite their work.
        serverSaveStoppedRef.current = true;
        setNotice(t("status.serverSaveStopped"), true);
      } else {
        // A hiccup on the way, not a decision: keep the change pending and say
        // plainly what the server answered instead of falling silent.
        serverSavePendingRef.current = true;
        scheduleServerSaveRetry(SERVER_SAVE_IDLE_MS);
        setNotice(error instanceof Error ? localizedError(error.message) : t("status.serverSaveRetry"));
      }
    } finally {
      serverSaveRunningRef.current = false;
    }
  }, [onSaveSharedProject, placementElevation, placementWorkplane, projectCreatedAt, projectName, scheduleServerSaveRetry, serverFileName, snapGrid]);

  const saveToServerRef = useRef(saveToServerNow);
  saveToServerRef.current = saveToServerNow;

  useEffect(() => {
    if (!serverFileName) return;
    // Verglichen wird der Inhalt, nicht die Anzahl der Durchlaeufe. Ein Entwurf
    // laedt seine Formen nach, und dieser Effekt lief danach ein zweites Mal -
    // mit demselben Inhalt. Das galt frueher als Aenderung und liess einen
    // Entwurf, den niemand angefasst hatte, kurz darauf hochladen.
    const fingerprint = projectSceneFingerprint(shapes, notes);
    if (serverSaveProjectRef.current !== (projectId ?? null)) {
      serverSaveProjectRef.current = projectId ?? null;
      serverSaveStoppedRef.current = false;
      serverSavePendingRef.current = false;
      // Nur ersatzweise: Hat das Laden schon einen Stand hinterlassen, gilt der.
      if (serverSavedFingerprintRef.current?.projectId !== (projectId ?? null)) {
        serverSavedFingerprintRef.current = { projectId: projectId ?? null, fingerprint };
      }
      return;
    }
    if (fingerprint === serverSavedFingerprintRef.current?.fingerprint) return;
    serverSavedFingerprintRef.current = { projectId: projectId ?? null, fingerprint };
    serverSavePendingRef.current = true;
    if (serverSaveTimerRef.current !== null) window.clearTimeout(serverSaveTimerRef.current);
    serverSaveTimerRef.current = window.setTimeout(() => {
      serverSaveTimerRef.current = null;
      void saveToServerRef.current();
    }, SERVER_SAVE_IDLE_MS);
  }, [notes, projectId, serverFileName, shapes]);

  // Leaving the editor is the other moment worth saving at. The upload itself
  // lives in the page above, so it survives this component going away.
  useEffect(() => () => {
    if (serverSaveTimerRef.current !== null) window.clearTimeout(serverSaveTimerRef.current);
    void saveToServerRef.current();
  }, []);

  /**
   * Das Vorschaubild jetzt aufnehmen statt in zweieinhalb Sekunden.
   *
   * Wer nach der letzten Aenderung gleich zur Uebersicht geht, sah dort bisher
   * das Bild von vorhin: Die Aufnahme wartet normalerweise, bis Ruhe
   * eingekehrt ist, und wurde mit dem Editor zusammen abgebrochen, wenn der
   * schon weg war. Hier gibt es kein Abbruchsignal - der Upload gehoert der
   * Seite darueber und ueberlebt dieses Bauteil.
   */
  const flushProjectSnapshot = useCallback(async ({ evenIfUnchanged = false } = {}) => {
    if (!projectId || !onProjectSnapshot || typeof window === "undefined") return;
    const currentShapes = shapesRef.current;
    const sceneKey = { projectId, fingerprint: projectShapesFingerprint(currentShapes) };
    // Leaving takes the picture even when no shape changed: zooming or turning
    // the view alone does not count as a change, and the start page kept the
    // view from the last edit (#90). Not while the design is still loading.
    const known = lastProjectSnapshotRef.current?.projectId === projectId && !projectHydratingRef.current;
    if (!(evenIfUnchanged && known) && !projectThumbnailSceneChanged(lastProjectSnapshotRef.current, sceneKey)) return;
    const image = window.layerlingCaptureCanvasAsync
      ? await window.layerlingCaptureCanvasAsync()
      : window.layerlingCaptureCanvas?.() ?? "";
    if (!image || image.length <= 100) return;
    lastProjectSnapshotRef.current = sceneKey;
    void Promise.resolve(onProjectSnapshot({ image, projectId, shapes: currentShapes.length })).catch(() => {});
  }, [onProjectSnapshot, projectId]);

  /**
   * Das Haus fuehrt zur Uebersicht - erst ist das Bild an der Reihe, aber es
   * darf den Weg nicht versperren.
   *
   * `canvas.toBlob` haengt in einem Fenster, das im Hintergrund liegt: Der
   * Zeichentakt ruht dort, und die Aufnahme kommt nie zurueck. Ohne diese Frist
   * bliebe der Knopf dann einfach wirkungslos - beim Messen genau so passiert.
   * Kommt das Bild rechtzeitig, reist es mit; kommt es nicht, geht es eben
   * ohne, und die Uebersicht zeigt wie bisher das Bild von vorhin.
   */
  const leaveToDashboard = useCallback(() => {
    if (!onHome) return;
    let left = false;
    const leave = () => {
      if (left) return;
      left = true;
      // Counted on the way out, so the start page can ask about a design left empty. Notes and
      // reference points are something in it too.
      onHome({ itemCount: shapesRef.current.length + notesRef.current.length });
    };
    window.setTimeout(leave, LEAVE_SNAPSHOT_DEADLINE_MS);
    // Der Entwurf auf dem Server wartet sonst auf den Fuenf-Sekunden-Takt. Wer
    // die Arbeitsflaeche verlaesst, ist fertig - dann soll er hochgeladen
    // werden, nicht gleich. Der Editor bleibt dabei im Baum stehen, also
    // greift das Aufraeumen beim Abbau hier gar nicht.
    if (serverSaveTimerRef.current !== null) {
      window.clearTimeout(serverSaveTimerRef.current);
      serverSaveTimerRef.current = null;
    }
    // A save still waiting for its pause goes now, before the start page may remove the design.
    saveProjectShapesNow();
    void saveToServerRef.current();
    void flushProjectSnapshot({ evenIfUnchanged: true }).finally(leave);
  }, [flushProjectSnapshot, onHome, saveProjectShapesNow]);

  // A saved design's bodies into the open one - for parts kept as building
  // blocks. Fresh ids so nothing clashes, embedded source files come along,
  // one undo step, the new bodies selected where they were saved.
  const insertLylDesign = useCallback(async (file: File) => {
    const sourceProjectId = projectInfoRef.current.projectId;
    setNotice(t("status.validatingFile", { name: file.name }), true);
    try {
      const restored = await importLylProject(await file.arrayBuffer());
      if (projectInfoRef.current.projectId !== sourceProjectId) {
        setNotice(t("status.importCancelled", { count: 1 }));
        return;
      }
      if (restored.shapes.length === 0) {
        setNotice(t("status.insertDesignEmpty", { name: file.name }));
        return;
      }
      const inserted = restored.shapes.map((shape) => canonicalizeShape(cloneWorkplaneShapeTreeWithFreshIds(shape, "insert")));
      if (restored.assets.length > 0) {
        const nextAssets = dedupeProjectAssets([...projectAssetsRef.current, ...restored.assets]);
        projectAssetsRef.current = nextAssets;
        setProjectAssets(nextAssets);
      }
      commitShapes(
        [...shapesRef.current, ...inserted],
        inserted.map((shape) => shape.id),
        t("status.insertedDesign", { count: inserted.length, name: file.name }),
      );
      setTopPanel(null);
    } catch (error) {
      setNotice(error instanceof Error ? localizedError(error.message) : t("status.insertDesignFailed", { name: file.name }));
    }
  }, [commitShapes]);

  const importFiles = useCallback(async (selected: File[]): Promise<{ importedIds: string[]; failures: Array<{ fileName: string; reason: string }> }> => {
    const none = { importedIds: [] as string[], failures: [] as Array<{ fileName: string; reason: string }> };
    if (!selected.length) return none;
    const projectFiles = selected.filter((file) => /\.(lyl|skf)$/i.test(file.name));
    if (projectFiles.length) {
      if (selected.length !== 1) {
        setNotice(t("status.oneLylAtATime"), true);
        return none;
      }
      if (!onOpenLylProjectFile) {
        setNotice(t("status.lylUnavailable"), true);
        return none;
      }
      setNotice(t("status.validatingFile", { name: projectFiles[0].name }), true);
      const result = await onOpenLylProjectFile(projectFiles[0]);
      if (result?.message) setNotice(result.message);
      if (result?.ok !== false) setTopPanel(null);
      return none;
    }
    const sourceProjectId = projectInfoRef.current.projectId;
    const result = await importModelFiles(selected, {
      cancelled: () => projectInfoRef.current.projectId !== sourceProjectId,
      // An SVG comes in as a sketch body, its fill changeable afterwards (#197); should the
      // kernel build it differently from the mesh, the mesh stays.
      svgAsSketch: async (mesh, profile) => {
        const built = await cadShapeFromSketchProfile(profile, mesh.height);
        if (!svgSketchMatchesMesh(built, mesh)) return null;
        return canonicalizeShape({ ...built, name: mesh.name, color: mesh.color, x: mesh.x, z: mesh.z });
      },
      onProgress: (index, total, file, isStep) => setNotice(t("status.importingFile", {
        index: index + 1,
        total,
        name: file.name,
        stepNote: isStep ? t("status.stepKernelNote") : "",
      }), true),
    });
    if (!result) {
      setNotice(t("status.importCancelled", { count: selected.length }));
      return none;
    }
    const { shapes: importedShapes, assets: importedAssets, files, failures, notes } = result;
    if (result.mtlOnly) {
      setNotice(t("status.importMtlAlone"), true);
      return { importedIds: [], failures };
    }
    const failureSummary = importFailureSummary(failures);

    if (!importedShapes.length) {
      setNotice(failures.length === 1 && files.length <= 1
        ? failures[0].reason
        : t("status.importNoneFailed", { total: Math.max(files.length, failures.length), summary: failureSummary }), true);
      return { importedIds: [], failures };
    }

    const successSummary = files.length === 1
      ? t("status.importedFile", { name: files[0].name })
      : t("status.importedFiles", { count: result.importedFileNames.length, total: files.length });
    const nextAssets = dedupeProjectAssets([...projectAssetsRef.current, ...importedAssets]);
    projectAssetsRef.current = nextAssets;
    setProjectAssets(nextAssets);
    commitShapes(
      [...shapesRef.current, ...importedShapes],
      importedShapes.map((shape) => shape.id),
      [successSummary, ...notes].join(" ") + failureSummary,
    );
    setTopPanel(null);
    return { importedIds: importedShapes.map((shape) => shape.id), failures };
  }, [commitShapes, onOpenLylProjectFile]);
  importFilesRef.current = importFiles;

  const selectFiles = useCallback(
    (files: FileList | File[]) => {
      const selectedFiles = Array.from(files);
      if (selectedFiles.length) void importFiles(selectedFiles);
    },
    [importFiles],
  );

  const selectShape = useCallback((id: string | string[] | null, mode: "replace" | "toggle" = "replace") => {
    setSelectedIds((current) => {
      if (Array.isArray(id)) {
        const unique = id.filter((entry, index) => id.indexOf(entry) === index);
        return mode === "toggle" ? unique.reduce((next, entry) => (next.includes(entry) ? next.filter((selected) => selected !== entry) : [...next, entry]), current) : unique;
      }
      if (!id) {
        return mode === "toggle" ? current : [];
      }
      if (mode === "toggle") {
        return current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id];
      }
      return [id];
    });
  }, []);

  const nudgeSelected = useCallback(
    (deltaX: number, deltaZ: number) => {
      if (!hasSelection) {
        return;
      }
      const selected = new Set(selectedIds);
      // Right and up on the keys mean right and away on the screen: each picks
      // the workplane axis that points that way most, so after turning the
      // view the keys still go where the arrows point (as in Tinkercad).
      const { xStep, zStep } = screenAlignedNudge(placementWorkplane, deltaX, deltaZ, window.layerlingScreenDirections?.());
      const translation = {
        x: placementWorkplane.xAxis.x * xStep + placementWorkplane.zAxis.x * zStep,
        y: placementWorkplane.xAxis.y * xStep + placementWorkplane.zAxis.y * zStep,
        z: placementWorkplane.xAxis.z * xStep + placementWorkplane.zAxis.z * zStep,
      };
      window.layerlingFollowMove?.(selectedShapes.filter((shape) => !shape.locked).map((shape) => shape.id), translation);
      commitShapes(
        shapes.map((shape) =>
          selected.has(shape.id) && !shape.locked
            ? {
                ...shape,
                x: cleanNearZero(shape.x + translation.x),
                z: cleanNearZero(shape.z + translation.z),
                elevation: cleanNearZero((shape.elevation ?? 0) + translation.y),
              }
            : shape,
        ),
        selectedIds,
        selectedShapes.length === 1 ? t("status.movedOne") : t("status.movedMany", { count: selectedShapes.length }),
      );
    },
    [commitShapes, hasSelection, placementWorkplane, selectedIds, selectedShapes, shapes],
  );

  const rotateSelectedBy = useCallback((angleDegrees: number) => {
    if (!hasSelection) {
      return;
    }
    if (projectInteractionActiveRef.current) {
      setNotice(t("status.finishBeforeRotate"));
      return;
    }

    const selected = new Set(selectedIds);
    const rotatableShapes = selectedShapes.filter((shape) => !shape.locked);
    if (rotatableShapes.length === 0) {
      setNotice(t("status.selectionLocked"));
      return;
    }

    const rotationDelta = geometryRotationDelta(placementWorkplane, angleDegrees);
    const pivot = activeRotationPivot
      ? new THREE.Vector3(activeRotationPivot.x, activeRotationPivot.y, activeRotationPivot.z)
      : rotatableShapes.length > 1 ? selectionCenterOnWorkplane(rotatableShapes, placementWorkplane) : null;

    const nextShapes = shapes.map((shape) => {
      if (!selected.has(shape.id) || shape.locked) {
        return shape;
      }

      const rotated = canonicalizeShape({ ...shape, ...rotatedGeometryShapePatch(shape, rotationDelta, pivot) });
      return canonicalizeShape(bakeShapeTransformIntoMesh(rotated));
    });

    const angleLabel = Number(angleDegrees.toFixed(1));
    commitShapes(
      nextShapes,
      selectedIds,
      rotatableShapes.length === 1
        ? t("status.rotatedOne", { angle: angleLabel })
        : t("status.rotatedMany", { count: rotatableShapes.length, angle: angleLabel }),
    );
  }, [activeRotationPivot, commitShapes, hasSelection, placementWorkplane, selectedIds, selectedShapes, shapes]);

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
      const shortcut = event.ctrlKey || event.metaKey;

      if (splitSession) {
        return;
      }

      // Im Verlaufsblick gehoeren die Tasten dem Blick: Pfeile gehen durch die
      // Staende, Escape kehrt zurueck. Alles andere - Loeschen, Einfuegen,
      // Rueckgaengig - wuerde das Projekt aendern, waehrend es etwas anderes zeigt.
      if (historyViewIndex !== null) {
        if (event.key === "Escape") {
          event.preventDefault();
          closeHistoryView();
        } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
          event.preventDefault();
          stepHistoryView(-1);
        } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
          event.preventDefault();
          stepHistoryView(1);
        } else if (event.key === "Home") {
          event.preventDefault();
          stepHistoryView(-Number.MAX_SAFE_INTEGER);
        } else if (event.key === "End") {
          event.preventDefault();
          stepHistoryView(Number.MAX_SAFE_INTEGER);
        }
        return;
      }

      if (sketchActive && toolbarMode === "sketch") {
        if (event.key === "Escape") {
          event.preventDefault();
          setSketchActivePointId(null);
          setSketchSelection(null);
          setNotice(t("status.sketchChainCleared"));
        } else if (event.key === "Delete" || event.key === "Backspace") {
          event.preventDefault();
          if (sketchSelection) deleteSelectedSketchEntity();
          else if (sketchMeasurement) clearSketchMeasurement();
          else deleteSelectedSketchEntity();
        } else if (shortcut && key === "z") {
          event.preventDefault();
          if (event.shiftKey) sketchRedo();
          else sketchUndo();
        } else if (shortcut && key === "y") {
          event.preventDefault();
          sketchRedo();
        } else if (shortcut && key === "c") {
          event.preventDefault();
          copySketchSelectionToClipboard();
        } else if (shortcut && key === "x") {
          event.preventDefault();
          cutSketchSelection();
        } else if (shortcut && key === "v") {
          event.preventDefault();
          pasteSketchSelection();
        } else if (shortcut && key === "d") {
          event.preventDefault();
          duplicateSketchSelection();
        } else if (!shortcut && !event.altKey && (event.code === "KeyR" || key === "r")) {
          event.preventDefault();
          rotateSelectedClosedSketch45();
        } else if (!shortcut && !event.altKey && (event.code === "KeyL" || key === "l")) {
          event.preventDefault();
          toggleSelectedSketchImageLock();
        }
        return;
      }

      if (event.key === "Escape") {
        // Erst das Werkzeug ablegen, dann die Auswahl - wer ein Werkzeug in der
        // Hand hat, meint mit Escape das Werkzeug.
        if (carryIdsRef.current) {
          event.preventDefault();
          setCarryIds(null);
          setNotice(t("status.carryCancelled"));
          return;
        }
        if (cruiseAssetRef.current) {
          event.preventDefault();
          setCruiseAsset(null);
          setNotice(t("status.cruiseCancelled"));
          return;
        }
        if (noteMode) {
          setNoteMode(false);
          setNotice("");
          return;
        }
        if (pivotPickMode) {
          setPivotPickMode(false);
          setNotice(t("status.pivotPickCancelled"));
          return;
        }
        if (layFlatPickMode) {
          setLayFlatPickMode(false);
          setNotice(t("status.layFlatCancelled"));
          return;
        }
        if (mateTool) {
          setMateTool(null);
          setNotice(t("status.mateCancelled"));
          return;
        }
        if (arrayTool) {
          setArrayTool(null);
          setNotice(t("status.arrayCancelled"));
          return;
        }
        if (scalePercentTool) {
          setScalePercentTool(null);
          setScalePercentError(null);
          return;
        }
        setSelectedIds([]);
        setNotice(t("status.selectionCleared"));
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelected();
        return;
      }

      if (shortcut && key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if (shortcut && key === "y") {
        event.preventDefault();
        redo();
        return;
      }

      if (shortcut && key === "c") {
        event.preventDefault();
        copySelected();
        return;
      }

      // C without Ctrl picks the selection up, as Tinkercad's Cruise: it follows the pointer over
      // the faces of other bodies and a click sets it down there (#195).
      if (!shortcut && !event.altKey && !event.shiftKey && key === "c" && hasSelection) {
        event.preventDefault();
        const ids = selectedIds.filter((id) => shapes.some((shape) => shape.id === id && !shape.locked));
        if (!ids.length) {
          setNotice(t("status.carryLocked"));
          return;
        }
        setCruiseAsset(null);
        setCarryIds(ids);
        setNotice(t("status.carryPlace"));
        return;
      }

      if (shortcut && key === "x") {
        event.preventDefault();
        cutSelected();
        return;
      }

      if (shortcut && key === "v") {
        event.preventDefault();
        pasteShape();
        return;
      }

      if (shortcut && key === "d") {
        event.preventDefault();
        duplicateSelected();
        return;
      }

      if (shortcut && key === "a") {
        event.preventDefault();
        setSelectedIds(shapes.filter((shape) => !shape.hidden).map((shape) => shape.id));
        setNotice(t("status.selectedAllVisible"));
        return;
      }

      if (shortcut && key === "b" && !event.shiftKey) {
        event.preventDefault();
        bundleSelected();
        return;
      }

      if (shortcut && key === "g") {
        event.preventDefault();
        if (event.shiftKey) {
          ungroupSelected();
        } else {
          groupSelected();
        }
        return;
      }

      if (shortcut && key === "l") {
        event.preventDefault();
        toggleLocked();
        return;
      }

      if (shortcut && key === "h") {
        event.preventDefault();
        if (event.shiftKey) {
          showHidden();
        } else {
          toggleHidden();
        }
        return;
      }

      if (shortcut && (key === "o" || key === "O") && event.shiftKey) {
        event.preventDefault();
        setOutlinerOpen((open) => !open);
        return;
      }

      if (shortcut && key === "e" && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        setTopPanel("export");
        return;
      }

      if (shortcut && key === "i" && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        setTopPanel("import");
        return;
      }

      const geometryRotationDegrees = geometryRotationDegreesForShortcut(event);
      if (geometryRotationDegrees !== null && hasSelection) {
        event.preventDefault();
        rotateSelectedBy(geometryRotationDegrees);
        return;
      }

      // Follows the Snap Grid so a keyboard nudge lands on the same lattice
      // a pointer drag snaps to. Falls back to the old millimetre when the
      // grid is off.
      // With nothing selected the arrow keys turn the view instead, 15 degrees
      // a press (Shift: 90). The arrows turn the model: right turns its front
      // to the right, up tilts its front upwards.
      if (!hasSelection && !shortcut && !event.altKey && ARROW_KEYS.has(event.key) && window.layerlingOrbitView) {
        event.preventDefault();
        const angle = event.shiftKey ? 90 : 15;
        if (event.key === "ArrowLeft") window.layerlingOrbitView(angle, 0);
        else if (event.key === "ArrowRight") window.layerlingOrbitView(-angle, 0);
        else if (event.key === "ArrowUp") window.layerlingOrbitView(0, angle);
        else window.layerlingOrbitView(0, -angle);
        return;
      }

      const step = keyboardNudgeStep(snapGridRef.current, event.shiftKey);
      if (shortcut && event.key === "ArrowUp") {
        event.preventDefault();
        raiseSelected(step);
      } else if (shortcut && event.key === "ArrowDown") {
        event.preventDefault();
        raiseSelected(-step);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        nudgeSelected(-step, 0);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        nudgeSelected(step, 0);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        nudgeSelected(0, -step);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        nudgeSelected(0, step);
      } else if (key === "d" && hasSelection) {
        event.preventDefault();
        dropSelectedToWorkplane();
      } else if (key === "h") {
        event.preventDefault();
        setSelectionHoleMode(true);
      } else if (key === "s") {
        event.preventDefault();
        setSelectionHoleMode(false);
      } else if (key === "m") {
        event.preventDefault();
        toggleMirrorMode();
      } else if (key === "l") {
        event.preventDefault();
        toggleAlignMode();
      } else if (key === "n") {
        event.preventDefault();
        toggleNoteTool();
      } else if (key === "e" && !shortcut && !event.altKey) {
        event.preventDefault();
        editSelectedGroup();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    closeHistoryView,
    historyViewIndex,
    stepHistoryView,
    commitShapes,
    clearSketchMeasurement,
    copySelected,
    copySketchSelectionToClipboard,
    noteMode,
    toggleNoteTool,
    cutSelected,
    cutSketchSelection,
    deleteSelected,
    deleteSelectedSketchEntity,
    duplicateSelected,
    duplicateSketchSelection,
    dropSelectedToWorkplane,
    editSelectedGroup,
    bundleSelected, groupSelected,
    hasSelection,
    nudgeSelected,
    arrayTool,
    pasteShape,
    pasteSketchSelection,
    pivotPickMode,
    layFlatPickMode,
    raiseSelected,
    redo,
    rotateSelectedBy,
    rotateSelectedClosedSketch45,
    sketchActive,
    sketchRedo,
    sketchMeasurement,
    sketchSelection,
    sketchUndo,
    splitSession,
    setSelectionHoleMode,
    showHidden,
    toggleAlignMode,
    toggleHidden,
    toggleMirrorMode,
    toggleLocked,
    toggleSelectedSketchImageLock,
    toolbarMode,
    undo,
    ungroupSelected,
    // Esc closes these tools, and Ctrl+A picks from the current shapes: a handler from before
    // they opened, or before a shape was added, closed nothing and missed new shapes.
    mateTool,
    scalePercentTool,
    shapes,
  ]);

  /*
   * Rechtsklick auf einen Koerper: die Befehle, die man sonst im Menueband
   * sucht oder nur als Kuerzel kennt, gleich am Objekt. Sie wirken auf die
   * Auswahl - der Viewport hat den angeklickten Koerper schon ausgewaehlt.
   */
  const [shapeContextMenu, setShapeContextMenu] = useState<{ x: number; y: number; onShape: boolean } | null>(null);
  const closeShapeContextMenu = useCallback(() => setShapeContextMenu(null), []);
  const openShapeContextMenu = useCallback((request: { shapeId: string | null; clientX: number; clientY: number }) => {
    setShapeContextMenu({ x: request.clientX, y: request.clientY, onShape: Boolean(request.shapeId) });
  }, []);
  const shapeContextMenuItems = (): ShapeContextMenuItem[] => {
    if (!shapeContextMenu) return [];
    if (!shapeContextMenu.onShape || !hasSelection) {
      const items: ShapeContextMenuItem[] = [
        { key: "paste", label: t("contextMenu.paste"), shortcut: "Ctrl+V", onSelect: () => void pasteShape() },
        { key: "selectAll", label: t("contextMenu.selectAll"), shortcut: "Ctrl+A", onSelect: selectAllVisible },
      ];
      if (shapes.some((shape) => shape.hidden)) items.push({ key: "showHidden", label: t("contextMenu.showHidden"), shortcut: "Ctrl+Shift+H", onSelect: showHidden });
      return items;
    }
    const allHoles = selectedShapes.every((shape) => shape.hole);
    const allLocked = selectedShapes.every((shape) => shape.locked);
    const single = selectedShapes.length === 1 ? selectedShapes[0] : null;
    const items: ShapeContextMenuItem[] = [
      { key: "duplicate", label: t("common.duplicate"), shortcut: "Ctrl+D", onSelect: duplicateSelected },
      { key: "copy", label: t("editor.tool.copy"), shortcut: "Ctrl+C", onSelect: copySelected },
      allHoles
        ? { key: "solid", label: t("contextMenu.toSolid"), shortcut: "S", separated: true, onSelect: () => setSelectionHoleMode(false) }
        : { key: "hole", label: t("contextMenu.toHole"), shortcut: "H", separated: true, onSelect: () => setSelectionHoleMode(true) },
    ];
    if (selectedShapes.length >= 2) items.push({ key: "group", label: t("contextMenu.group"), shortcut: "Ctrl+G", onSelect: () => void groupSelected() });
    if (single?.groupedShapes?.length) items.push({ key: "ungroup", label: t("contextMenu.ungroup"), shortcut: "Ctrl+Shift+G", onSelect: ungroupSelected });
    if (single) {
      items.push(
        { key: "chamfer", label: t("editor.tool.chamfer"), separated: true, onSelect: () => startEdgeModifier("chamfer") },
        { key: "fillet", label: t("editor.tool.fillet"), onSelect: () => startEdgeModifier("fillet") },
        { key: "hollow", label: t("editor.tool.hollow"), onSelect: startShellTool },
      );
    }
    if (!allLocked) items.push({ key: "scalePercent", label: t("scalePercent.title"), separated: true, onSelect: toggleScalePercentTool });
    if (single && offersMeshSimplify(single) && !single.locked) items.push({ key: "simplify", label: t("contextMenu.simplify"), separated: true, onSelect: startSimplifyTool });
    if (!allHoles) {
      items.push(
        { key: "markCenter", label: t("contextMenu.markCenter"), separated: true, onSelect: () => markSelectionPoints("center") },
        { key: "markCorners", label: t("contextMenu.markCorners"), onSelect: () => markSelectionPoints("corners") },
        { key: "markMidpoints", label: t("contextMenu.markMidpoints"), onSelect: () => markSelectionPoints("midpoints") },
      );
    }
    items.push(
      { key: "hide", label: t("contextMenu.hide"), shortcut: "Ctrl+H", separated: true, onSelect: toggleHidden },
      { key: "lock", label: t(allLocked ? "contextMenu.unlock" : "contextMenu.lock"), shortcut: "Ctrl+L", onSelect: toggleLocked },
      { key: "drop", label: t("contextMenu.drop"), shortcut: "D", onSelect: dropSelectedToWorkplane },
      { key: "delete", label: t("common.delete"), shortcut: t("contextMenu.deleteKey"), danger: true, separated: true, onSelect: deleteSelected },
    );
    return items;
  };

  return (
    <div className={`layerling-editor ${historyViewState ? "history-view-active" : ""}`}>
      <SecondaryToolbar
        toolbarMode={toolbarMode}
        projectName={projectName}
        onProjectNameChange={onProjectNameChange}
        onToolbarModeChange={(mode) => {
          setToolbarMode(mode);
          if (mode !== "geometry") {
            if (cruiseAssetRef.current) setNotice("");
            setCruiseAsset(null);
          }
          setWorkplaneMode(false);
          setTopPanel(null);
        }}
        outlinerOpen={outlinerOpen}
        onToggleOutliner={toggleOutliner}
        canUndo={!splitSession && !projectInteractionActive && historyViewIndex === null && (historyIndex > 0 || Boolean(edgeModifier))}
        canRedo={!splitSession && !projectInteractionActive && historyViewIndex === null && historyIndex < history.length - 1}
        canHistoryView={historyViewIndex !== null || (!splitSession && !projectInteractionActive && !edgeModifier && !openGroup && history.length > 1)}
        historyViewActive={historyViewIndex !== null}
        onHistoryView={historyViewIndex === null ? openHistoryView : closeHistoryView}
        canGroup={selectedShapes.length > 1 && selectedShapes.every((shape) => !shape.locked && !isNonSolidShapeKind(shape.kind))}
        canIntersect={canIntersectShapes(selectedShapes.filter((shape) => !shape.locked && !isNonSolidShapeKind(shape.kind)))}
        canUngroup={selectedShapes.some((shape) => Boolean(shape.groupedShapes?.length))}
        hasClipboard={clipboard.length > 0 || systemClipboardSupported}
        hasSelection={hasSelection}
        hiddenShapeCount={shapes.filter((shape) => shape.hidden).length}
        selectionHidden={hasSelection && selectedShapes.every((shape) => shape.hidden)}
        alignMode={alignMode}
        canAlign={selectedShapes.length > 1}
        canEdgeModify={selectedShapes.length === 1 && Boolean(selectedShape && !selectedShape.locked && !selectedShape.hole && !isNonSolidShapeKind(selectedShape.kind))}
        edgeModifierKind={edgeModifier?.kind ?? null}
        mirrorMode={mirrorMode}
        canSplit={canSplitSelection}
        splitMode={Boolean(splitSession)}
        sketchActive={sketchActive}
        sketchOperation={sketchOperation}
        sketchTool={sketchTool}
        sketchCanUndo={sketchHistoryIndex > 0}
        sketchCanRedo={sketchHistoryIndex < sketchHistory.length - 1}
        sketchHasSelection={sketchSelection !== null}
        sketchHasClipboard={sketchClipboard !== null}
        canEditSketch={selectedShapes.length === 1 && Boolean(selectedShape?.sketchProfile)}
        canFilletSketchPoint={canFilletSketchPoint}
        sketchCornerDialog={sketchCornerDialog}
        onSketchCornerDialog={setSketchCornerDialog}
        sketchStrokeActive={sketchStrokePanelOpen || Boolean(sketchProfile.stroke)}
        onSketchStroke={() => setSketchStrokePanelOpen((open) => !open)}
        onStartSketch={(operation) => beginSketch(operation)}
        onEditSketch={beginSketchEdit}
        onSketchTool={setActiveSketchTool}
        onSketchPrimitive={(primitive) => addSketchPrimitive(primitive, { x: 0, z: 0 })}
        onSketchImage={() => {
          if (sketchTool !== "select") {
            setNotice(t("status.chooseSelectFirst"));
            return;
          }
          sketchImageInputRef.current?.click();
        }}
        onSketchCopy={copySketchSelectionToClipboard}
        onSketchPaste={pasteSketchSelection}
        onSketchDuplicate={duplicateSketchSelection}
        onSketchDelete={deleteSelectedSketchEntity}
        onSketchUndo={sketchUndo}
        onSketchRedo={sketchRedo}
        onSketchFinish={finishSketch}
        onSketchCancel={cancelSketch}
        onHome={onHome ? leaveToDashboard : undefined}
        onAlign={toggleAlignMode}
        onChamfer={() => edgeModifier?.kind === "chamfer" ? cancelEdgeModifier() : startEdgeModifier("chamfer")}
        onCopy={copySelected}
        onDelete={deleteSelected}
        onDuplicate={duplicateSelected}
        onCenterOnWorkplane={centerSelectionOnWorkplane}
        onDropToWorkplane={dropSelectedToWorkplane}
        onLayFlat={toggleLayFlat}
        layFlatActive={layFlatPickMode}
        onMateFaces={toggleMateFaces}
        mateFacesActive={Boolean(mateTool)}
        onGroup={groupSelected}
        onBundle={bundleSelected}
        onIntersect={intersectSelected}
        onFillet={() => edgeModifier?.kind === "fillet" ? cancelEdgeModifier() : startEdgeModifier("fillet")}
        onHollow={startShellTool}
        hollowActive={Boolean(shellTool)}
        canSimplify={selectedShapes.length === 1 && offersMeshSimplify(selectedShape) && !selectedShape?.locked}
        onSimplify={startSimplifyTool}
        simplifyActive={Boolean(simplifyToolShape)}
        onMirror={toggleMirrorMode}
        onRotationPivot={toggleRotationPivot}
        onArray={toggleArrayTool}
        arrayActive={Boolean(arrayTool)}
        onScalePercent={toggleScalePercentTool}
        scalePercentActive={Boolean(scalePercentTool)}
        rotationPivotActive={pivotPickMode || Boolean(activeRotationPivot)}
        onSplit={toggleSplitMode}
        onPaste={pasteShape}
        onRedo={redo}
        onSnap={snapSelected}
        onShowHidden={showHidden}
        onToggleHidden={toggleHidden}
        onUngroup={ungroupSelected}
        onUndo={undo}
        onShortcuts={() => setShortcutsOpen(true)}
        onGuide={() => setGuideOpen(true)}
        noteMode={noteMode}
        notesVisible={notesVisible}
        noteCount={notes.length}
        onNoteTool={toggleNoteTool}
        onToggleNotes={toggleNotesVisible}
        overhangsVisible={overhangsVisible}
        overhangAngle={workspaceSettings.overhangAngle}
        onToggleOverhangs={toggleOverhangsVisible}
        onTopPanel={(panel) => {
          setTopPanel((current) => (current === panel ? null : panel));
        }}
        objects={shapes.map((shape) => ({ id: shape.id, name: displayShapeName(shape), kind: shape.kind, hidden: Boolean(shape.hidden) }))}
        onSelectObject={(id) => selectShape(id)}
        renderMyShapes={(close) => (
          <MyShapesSection
            shapes={customShapeEntries}
            serverAvailable={serverShapes !== null}
            canSave={selectedIds.length > 0}
            defaultName={selectedShapes.length === 1 ? displayShapeName(selectedShapes[0]) : t("myShapes.defaultName")}
            onInsert={(id) => {
              close();
              void insertMyShape(id).catch((error) => setNotice(error instanceof Error ? localizedError(error.message) : String(error)));
            }}
            onSave={async (name, location) => {
              try {
                await saveSelectionAsMyShape(name, undefined, location);
                return true;
              } catch (error) {
                setNotice(error instanceof Error ? localizedError(error.message) : String(error));
                return false;
              }
            }}
            onRename={(id, name) => void renameMyShapeEntry(id, name).catch((error) => setNotice(error instanceof Error ? localizedError(error.message) : String(error)))}
            onDelete={(id) => void deleteMyShapeEntry(id).catch((error) => setNotice(error instanceof Error ? localizedError(error.message) : String(error)))}
            onBackup={() => void backUpMyShapes().catch((error) => setNotice(error instanceof Error ? localizedError(error.message) : String(error)))}
            onMoveToServer={(id) => void moveMyShapeToServer(id).catch((error) => setNotice(error instanceof Error ? localizedError(error.message) : String(error)))}
            onLoad={() => myShapesFileInputRef.current?.click()}
            onShown={() => void refreshServerShapes()}
            onDragDone={close}
          />
        )}
        onAddShape={(shape) => {
          setTopPanel(null);
          if (workspaceSettings.clickToPlaceShapes) {
            startCruise(shape);
            return;
          }
          addShape(shape);
        }}
      />
      <div className="editor-body">
        {outlinerOpen ? (
          <ObjectListPanel
            inert={historyViewState !== null}
            shapes={historyViewState?.shapes ?? shapes}
            selectedIds={historyViewState ? [] : selectedIds}
            onSelectShape={selectShape}
            onToggleLock={toggleShapeLockById}
            onToggleHidden={toggleShapeHiddenById}
            onRenameShape={renameShapeById}
            onOpenGroup={openGroupForEditing}
            openGroupPartIds={openGroup?.childIds}
            onClose={() => setOutlinerOpen(false)}
          />
        ) : null}
        {toolbarMode === "sketch" && sketchActive ? (
          <SketchWorkspace
            profile={sketchProfile}
            operation={sketchOperation}
            revolvePreviewPositions={sketchRevolvePreview?.positions ?? null}
            referenceShapes={sketchReferenceShapes.filter((shape) => shape.id !== editingSketchShapeId)}
            referenceSlices={sketchReferenceSlices}
            tool={sketchTool}
            activePointId={sketchActivePointId}
            selected={sketchSelection}
            measurement={sketchMeasurement}
            pendingMeasurementStart={sketchMeasureStart}
            initialSnap={snapGrid}
            initialWorkspace={workspaceSettings}
            onPlanePoint={addSketchPlanePoint}
            onAddPrimitive={addSketchPrimitive}
            onPointPress={pressSketchPoint}
            onSelectSegment={(id) => {
              setSketchSelection({ kind: "segment", id });
              setSketchActivePointId(null);
            }}
            onToggleSelect={(entity) => {
              const next = toggleSketchSelection(sketchSelection, entity);
              setSketchSelection(next);
              setSketchActivePointId(null);
              const count = sketchSelectionCount(next);
              setNotice(count === 0
                ? t("status.sketchSelectionCleared")
                : count === 1 ? t("status.sketchSelectedOne") : t("status.sketchSelectedMany", { count }));
            }}
            onSelectMany={(pointIds, segmentIds, imageIds) => {
              setSketchSelection(pointIds.length || segmentIds.length || imageIds.length ? { kind: "multiple", pointIds, segmentIds, imageIds } : null);
              setSketchActivePointId(null);
              const count = pointIds.length + segmentIds.length + imageIds.length;
              setNotice(count === 0
                ? t("status.sketchSelectionCleared")
                : count === 1 ? t("status.sketchSelectedOne") : t("status.sketchSelectedMany", { count }));
            }}
            onSelectImage={(id) => {
              setSketchSelection({ kind: "image", id });
              setSketchActivePointId(null);
              setNotice(t("status.sketchImageSelected"));
            }}
            onUpdateImage={updateSketchImage}
            onDeleteImage={deleteSketchImage}
            onDeletePoint={deleteSketchPoint}
            onDeleteSegment={deleteSketchSegment}
            onMovePoint={moveSketchPoint}
            onTransformPoints={transformSketchPoints}
            onMoveHandle={moveSketchHandle}
            onInsertPoint={insertSketchPoint}
            onSetPointMode={setSketchPointMode}
            onCurveSegment={curveSketchSegmentAction}
            onStraightenSegment={straightenSketchSegmentAction}
            onApplyFillet={applySketchFilletHandler}
            onApplyChamfer={applySketchChamferHandler}
            onClearMeasurement={clearSketchMeasurement}
            onMeasureTool={() => setActiveSketchTool(sketchTool === "measure" ? "select" : "measure")}
            cornerDialog={sketchCornerDialog}
            onCornerDialogChange={setSketchCornerDialog}
            strokePanelOpen={sketchStrokePanelOpen && sketchOperation !== "revolve"}
            onCloseStrokePanel={() => setSketchStrokePanelOpen(false)}
            onStrokeChange={(stroke) => commitSketchProfile(
              { ...sketchProfile, stroke },
              t(stroke ? "status.sketchStrokeSet" : "status.sketchStrokeOff"),
            )}
            onSilhouetteChange={(silhouette) => {
              const next: SketchProfile = { ...sketchProfile, silhouette };
              if (!silhouette) delete next.silhouette;
              commitSketchProfile(next, t(silhouette ? "status.sketchSilhouetteOn" : "status.sketchSilhouetteOff"));
            }}
            strokePreview={sketchStrokePreview}
          />
        ) : (
          <WorkplaneViewport
          projectName={projectName}
          projectId={editorOpen ? projectId ?? null : null}
          shapes={historyViewState ? historyViewState.shapes : viewportShapes}
          selectedIds={historyViewState ? [] : selectedIds}
          alignMode={alignMode}
          alignAnchorId={effectiveAlignAnchorId}
          alignHandles={alignHandleStatuses}
          alignReferenceShapes={shapes}
          mirrorMode={mirrorMode}
          mirrorReferenceShapes={shapes}
          splitActive={Boolean(splitSession) || historyViewState !== null}
          splitPlane={splitPlane}
          onSplitPositionChange={changeSplitPosition}
          splitSurfacePick={Boolean(splitSession?.picking)}
          onSplitSurfacePick={pickSplitSurface}
          placementWorkplane={historyViewState ? historyViewState.placementWorkplane : placementWorkplane}
          workplaneHidden={workplaneHidden}
          onToggleWorkplaneHidden={() => {
            const next = !workplaneHiddenRef.current;
            workplaneHiddenRef.current = next;
            setWorkplaneHidden(next);
            setNotice(next ? t("status.workplaneHidden") : t("status.workplaneShown"));
          }}
          workplaneMode={workplaneMode}
          initialSnap={snapGrid}
          initialWorkspace={workspaceSettings}
          workspaceSettingsKey={projectId ?? "local-workplane"}
          cruiseAsset={historyViewState ? null : cruiseAsset}
          carryIds={historyViewState ? null : carryIds}
          onCarryDrop={dropCarried}
          onCancelCruise={stopCruise}
          onAddShape={addShape}
          onDropMyShape={(id, point) => void insertMyShape(id, point).catch((error) => setNotice(error instanceof Error ? localizedError(error.message) : String(error)))}
          onAlignAnchorChange={chooseAlignAnchor}
          onAlignPreview={previewAlignSelection}
          onAlignPreviewClear={clearAlignPreview}
          onAlignSelection={alignSelectionTo}
          onMirrorPreview={previewMirrorSelection}
          onMirrorPreviewClear={clearMirrorPreview}
          onMirrorSelection={mirrorSelectionAcross}
          onSelectShape={selectShape}
          onShapeContextMenu={historyViewState ? undefined : openShapeContextMenu}
          onSetPlacementWorkplane={setViewportPlacementWorkplane}
          onToggleWorkplaneTool={activateWorkplaneTool}
          onInteractionActiveChange={updateProjectInteractionActive}
          onEditSketch={beginSketchEdit}
          onOpenGroup={selectedShapes.length === 1 && canEditGroup(selectedShape) ? openGroupForEditing : undefined}
          canSeparateParts={canSeparateSelectedParts}
          onSeparateParts={separateSelectedParts}
          onSelectionHole={setSelectionHoleMode}
          onSelectionColor={setSelectionColor}
          onSelectionLock={toggleLocked}
          onWrapAroundCylinder={selectedShapes.length === 1 && offersCylinderWrap(selectedShape) ? wrapSelectionAroundCylinder : undefined}
          onLayerText={selectedShapes.length === 1 && offersTextLayers(selectedShape) ? layerSelectedText : undefined}
          onTextTags={selectedShapes.length === 1 && offersTextLayers(selectedShape) ? makeTextTags : undefined}
          textLayerStack={selectedNameTag}
          prepareNewShape={prepareNewShape}
          onUpdateShape={updateShape}
          onDuplicateShapeAt={duplicateShapeAt}
          onDuplicateShapesMoved={duplicateShapesMoved}
          notes={historyViewState ? historyViewState.notes : notes}
          notesVisible={notesVisible}
          showOverhangs={overhangsVisible}
          noteMode={historyViewState ? false : noteMode}
          rotationPivot={activeRotationPivot}
          pivotPickMode={pivotPickMode}
          onPivotPick={pickRotationPivot}
          layFlatPickMode={layFlatPickMode}
          onLayFlatPick={layFlatOnFace}
          mateFacePick={mateTool && mateTool.step !== "ready"
            ? { shapeIds: mateTool.step === "source" ? [mateTool.sourceId] : shapes.filter((shape) => shape.id !== mateTool.sourceId && !shape.hidden).map((shape) => shape.id) }
            : null}
          onMateFacePick={pickMateFace}
          onNoteAdd={addNote}
          onNoteUpdate={updateNote}
          onNoteRemove={removeNote}
          onNoteModeChange={setNoteMode}
          onWorkspaceSettingsChange={updateProjectWorkspaceSettings}
          onWorkplaneModeChange={closeViewportWorkplaneMode}
          modifierActive={Boolean(edgeModifier)}
          modifierPreviewActive={Boolean(edgeModifier?.preview)}
          modifierEdges={edgeModifier?.edges.filter((edge) => modifierCandidateEdgeIds.includes(edge.id)) ?? []}
          modifierHighlightedEdgeIds={modifierAvailableEdgeIds}
          selectedModifierEdgeIds={edgeModifier?.selectedEdgeIds ?? []}
          onModifierEdgeToggle={toggleModifierEdge}
          themePreference={themePreference}
          resolvedTheme={resolvedTheme}
          onThemePreferenceChange={onThemePreferenceChange}
          onExportSectionSvg={(axis, offset) => void exportSectionSvg(axis, offset)}
          onSectionContours={sectionContours}
          />
        )}
      </div>
      {shapeContextMenu && toolbarMode === "geometry" ? (
        <ShapeContextMenu
          x={shapeContextMenu.x}
          y={shapeContextMenu.y}
          label={t("contextMenu.label")}
          items={shapeContextMenuItems()}
          onClose={closeShapeContextMenu}
        />
      ) : null}
      <AppFooter variant="editor" version={LYL_CREATED_WITH_VERSION} onBugReport={() => void saveBugReport()} />
      {historyViewState && toolbarMode === "geometry" ? (
        <HistoryViewOverlay
          index={historyViewState.index}
          count={history.length}
          liveIndex={historyIndex}
          recordedAt={historyViewState.entry.at}
          objectCount={historyViewState.shapes.length}
          creating={historyProjectCreating}
          canCreateProject={Boolean(onCreateProjectFromState)}
          onIndexChange={(index) => setHistoryViewIndex(Math.min(Math.max(0, index), Math.max(0, history.length - 1)))}
          onExport={() => setTopPanel((current) => (current === "export" ? null : "export"))}
          onCreateProject={() => void createProjectFromHistoryState()}
          onClose={closeHistoryView}
        />
      ) : null}
      {openGroup ? (
        <div className="open-group-banner" role="status">
          <span>
            {t("group.editing", { path: openGroups.map((level) => displayShapeName(level.original)).join(" › ") })}
            {openGroup.original.edgeTreatments?.length ? t("group.editingEdgeWarning") : ""}
          </span>
          <button type="button" className="open-group-cancel" onClick={cancelOpenGroup} disabled={openGroupBusy}>{t("common.cancel")}</button>
          <button type="button" className="open-group-done" onClick={() => void finishOpenGroup()} disabled={openGroupBusy}>{t("group.done")}</button>
        </div>
      ) : null}
      {overhangWarning ? (
        <div className="bed-overhang-warning" role="status">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{overhangWarning}</span>
        </div>
      ) : null}
      {arrayTool && selectedShapes.length > 0 ? (
        <ArrayPanel
          targetName={selectedShapes.length === 1 ? selectedShapes[0].name : t("array.targetMany", { count: selectedShapes.length })}
          settings={arrayTool}
          workspace={workspaceSettings}
          pivotSet={Boolean(activeRotationPivot)}
          onChange={(patch) => setArrayTool((current) => current ? { ...current, ...patch } : current)}
          onApply={applyArrayTool}
          onCancel={() => {
            setArrayTool(null);
            setNotice(t("status.arrayCancelled"));
          }}
        />
      ) : null}
      {scalePercentTool && selectedShapes.length > 0 ? (
        <ScalePercentPanel
          targetName={selectedShapes.length === 1 ? selectedShapes[0].name : t("array.targetMany", { count: selectedShapes.length })}
          count={selectedShapes.length}
          settings={scalePercentTool}
          workspace={workspaceSettings}
          error={scalePercentError}
          onChange={(patch) => {
            setScalePercentError(null);
            setScalePercentTool((current) => current ? { ...current, ...patch } : current);
          }}
          onApply={applyScalePercentTool}
          onCancel={() => {
            setScalePercentTool(null);
            setScalePercentError(null);
          }}
        />
      ) : null}
      {fontManagerOpen ? (
        <FontManagerPanel
          canApply={selectedShapes.some((shape) => shape.kind === "text")}
          loadRuntime={getManifoldRuntime}
          onUse={applyCustomFontToSelection}
          onNotice={(message) => setNotice(message)}
          onClose={() => setFontManagerOpen(false)}
        />
      ) : null}
      {simplifyToolShape ? (
        <MeshSimplifyPanel
          key={simplifyToolShape.id}
          shape={simplifyToolShape}
          onApply={applySimplifyTool}
          onCancel={() => setSimplifyToolId(null)}
        />
      ) : null}
      {mateTool && selectedShape ? (
        <MateFacesPanel
          targetName={displayShapeName(selectedShape)}
          step={mateTool.step}
          mode={mateTool.mode}
          gap={mateTool.gap}
          workspace={workspaceSettings}
          onModeChange={(mode) => setMateTool((current) => (current ? { ...current, mode } : current))}
          onGapChange={(gap) => setMateTool((current) => (current ? { ...current, gap } : current))}
          onApply={applyMateFaces}
          onCancel={() => {
            setMateTool(null);
            setNotice(t("status.mateCancelled"));
          }}
        />
      ) : null}
      {shellTool && selectedShape ? (
        <ShellPanel
          targetName={selectedShape.name}
          thickness={shellTool.thickness}
          maxThickness={shellMaxThickness({ width: shapeWidth(selectedShape), depth: shapeDepth(selectedShape), height: selectedShape.height }, shellTool.openings)}
          openings={shellTool.openings}
          workspace={workspaceSettings}
          busy={shellTool.busy}
          error={shellTool.error}
          onThicknessChange={(value) => setShellTool((current) => current ? { ...current, thickness: value, error: null } : current)}
          onOpeningsChange={(value) => setShellTool((current) => {
            if (!current) return current;
            // A wall that fitted a frame may be too thick once a floor has to stay.
            const max = shellMaxThickness({ width: shapeWidth(selectedShape), depth: shapeDepth(selectedShape), height: selectedShape.height }, value);
            return { ...current, openings: value, thickness: Math.min(current.thickness, max), error: null };
          })}
          edges={shellTool.edges}
          onEdgesChange={(value) => setShellTool((current) => current ? { ...current, edges: value, error: null } : current)}
          onApply={applyShellTool}
          onCancel={() => setShellTool(null)}
        />
      ) : null}
      {splitSession && splitPlane ? (
        <SplitPanel
          axis={splitSession.axis}
          rotation={splitSession.rotation}
          position={splitPlane.position}
          min={splitPlane.min}
          max={splitPlane.max}
          targetCount={splitTargetShapes.length}
          workspace={workspaceSettings}
          busy={splitSession.busy}
          error={splitSession.error}
          picking={splitSession.picking}
          onPickToggle={toggleSplitPick}
          onAxisChange={changeSplitAxis}
          onRotationChange={changeSplitRotation}
          onPositionChange={changeSplitPosition}
          onApply={() => void applySplit()}
          onCancel={cancelSplit}
        />
      ) : null}
      {edgeModifier ? (
        <EdgeModifierPanel
          kind={edgeModifier.kind}
          amount={edgeModifier.amount}
          maxAmount={edgeModifierMaxAmount}
          chamferAngle={edgeModifier.chamferAngle}
          quality={edgeModifier.quality}
          sharpAngle={edgeModifier.sharpAngle}
          workspace={workspaceSettings}
          tangentChain={edgeModifier.tangentChain}
          impliedEdgeCount={edgeModifierImpliedEdges}
          preserveEdgeSize={edgeModifier.preserveEdgeSize}
          targetName={selectedShape?.name ?? "Object"}
          groupedCount={selectedShape?.groupedShapes?.length ?? 0}
          appliedFeatureCount={selectedEdgeFeatureCount}
          reversibleFeatureCount={selectedReversibleEdgeFeatureCount}
          historyOptions={selectedEdgeHistoryOptions}
          selectedCount={edgeModifier.selectedEdgeIds.length}
          availableCount={modifierAvailableEdgeIds.length}
          busy={edgeModifier.busy}
          prepared={edgeModifier.prepared}
          error={edgeModifier.error}
          // The same value again changes nothing: dropping the preview for it left Apply
          // waiting on a computation nobody started (#204).
          onAmountChange={(value) => setEdgeModifier((current) => {
            if (!current?.prepared) return current;
            const amount = Math.max(MIN_EDGE_MODIFIER_AMOUNT, Math.min(edgeModifierMaxAmount, value));
            return amount === current.amount ? current : { ...current, amount, preview: null, busy: current.selectedEdgeIds.length > 0, error: null };
          })}
          onChamferAngleChange={(value) => setEdgeModifier((current) => {
            if (!current?.prepared) return current;
            const chamferAngle = Math.max(5, Math.min(85, value));
            return chamferAngle === current.chamferAngle ? current : { ...current, chamferAngle, preview: null, busy: current.selectedEdgeIds.length > 0, error: null };
          })}
          onQualityChange={(quality) => setEdgeModifier((current) => !current?.prepared || quality === current.quality ? current : { ...current, quality, preview: null, busy: current.selectedEdgeIds.length > 0, error: null })}
          onSharpAngleChange={(sharpAngle) => setEdgeModifier((current) => {
            if (!current?.prepared) return current;
            const nextAngle = Math.max(1, Math.min(CAD_MODIFIER_MAX_SHARP_ANGLE, sharpAngle));
            const availableIds = new Set(current.edges
              .filter((edge) => selectableCadModifierEdge(edge, nextAngle))
              .map((edge) => edge.id));
            const selectedEdgeIds = current.selectedEdgeIds.filter((edgeId) => availableIds.has(edgeId));
            return {
              ...current,
              sharpAngle: nextAngle,
              selectedEdgeIds,
              preview: null,
              busy: selectedEdgeIds.length > 0,
              error: availableIds.size === 0 ? t("edge.noEdgeAtThreshold") : selectedEdgeIds.length ? null : t("edge.selectAtLeastOne"),
            };
          })}
          onTangentChainChange={(tangentChain) => setEdgeModifier((current) => current?.prepared ? { ...current, tangentChain } : current)}
          onPreserveEdgeSizeChange={(preserveEdgeSize) => setEdgeModifier((current) => current?.prepared ? { ...current, preserveEdgeSize } : current)}
          onSelectAll={() => setEdgeModifier((current) => current?.prepared ? { ...current, selectedEdgeIds: modifierAvailableEdgeIds, preview: null, busy: modifierAvailableEdgeIds.length > 0, error: modifierAvailableEdgeIds.length ? null : current.error } : current)}
          onSelectTop={() => setEdgeModifier((current) => {
            if (!current?.prepared) return current;
            const topIds = topCadModifierEdgeIds(current.edges, modifierAvailableEdgeIds);
            return { ...current, selectedEdgeIds: topIds, preview: null, busy: topIds.length > 0, error: topIds.length ? null : t("edge.noTopEdges") };
          })}
          onClear={() => setEdgeModifier((current) => current?.prepared ? { ...current, selectedEdgeIds: [], preview: null, busy: false, error: t("edge.selectAtLeastOne") } : current)}
          onRemoveFeature={removeEdgeTreatment}
          onApply={applyEdgeModifier}
          onCancel={cancelEdgeModifier}
        />
      ) : null}
      {topPanel ? (
        <TopActionPanel
          panel={topPanel}
          projectName={historyViewName}
          shapeCount={exportableShapeCount}
          scopeLabel={exportScopeLabel}
          selectionLeavesOut={exportSelectionScoped && exportSelectedVisibleCount < exportVisibleCount ? { selected: selectedShapes.length, total: exportVisibleCount } : null}
          onSelectAll={selectAllVisible}
          onlyHoles={exportHolesOnly}
          hiddenCount={exportHiddenCount}
          estimateShapes={exportTargetShapes}
          onEstimatePrint={exportSolidVolume}
          onClose={() => setTopPanel(null)}
          onExport={exportDesign}
          onExportLyl={exportLylDesign}
          onExportStep={exportStepDesign}
          onExportImage={exportViewImage}
          sharedProjectsEnabled={sharedProjectsEnabled}
          lylExporting={lylExporting}
          stepExporting={stepExporting}
          onImportFiles={selectFiles}
          onPickFile={() => fileInputRef.current?.click()}
          onPickProjectFile={() => projectFileInputRef.current?.click()}
          onPickInsertProjectFile={() => insertProjectFileInputRef.current?.click()}
          workspaceHistoryLimit={workspaceSettings.historyLimit}
        />
      ) : null}
      <input
        ref={sketchImageInputRef}
        className="hidden-file-input"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/bmp,image/svg+xml"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void addSketchImageFile(file);
          event.currentTarget.value = "";
        }}
      />
      <input
        ref={projectFileInputRef}
        className="hidden-file-input"
        type="file"
        accept={projectFileAccept}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) selectFiles([file]);
          event.currentTarget.value = "";
        }}
      />
      <input
        ref={myShapesFileInputRef}
        className="hidden-file-input"
        type="file"
        multiple
        accept={myShapesFileAccept}
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = "";
          if (files.length) void loadMyShapeFiles(files);
        }}
      />
      <input
        ref={insertProjectFileInputRef}
        className="hidden-file-input"
        type="file"
        accept={projectFileAccept}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void insertLylDesign(file);
          event.currentTarget.value = "";
        }}
      />
      <input
        ref={fileInputRef}
        className="hidden-file-input"
        type="file"
        multiple
        accept={importFileAccept}
        onChange={(event) => {
          if (event.currentTarget.files) {
            selectFiles(event.currentTarget.files);
          }
          event.currentTarget.value = "";
        }}
      />
      {shortcutsOpen ? (
        <ShortcutsModal sketchMode={toolbarMode === "sketch"} onClose={() => setShortcutsOpen(false)} />
      ) : null}
      {guideOpen ? <GuideModal sharedStore={sharedProjectsEnabled} sketchMode={toolbarMode === "sketch"} onClose={() => setGuideOpen(false)} /> : null}
      {notice ? (
        <p className="editor-status" role="status" aria-live="polite" title={notice}>
          {notice}
        </p>
      ) : null}
      <pre data-codex-state hidden>
        {debugState}
      </pre>
      <pre data-codex-summary hidden>
        {compactDebugState}
      </pre>
    </div>
  );
}

const sketchReferenceIcons = {
  line: "sketch-tool-line.png",
  bezier: "sketch-tool-bezier-curve.png",
  smooth: "sketch-tool-smooth-curve.png",
  select: "sketch-tool-select.png",
  image: "sketch-tool-add-image.png",
  refine: "sketch-tool-add-or-remove-points.png",
  erase: "sketch-tool-erase.png",
  measure: "sketch-tool-measure.png",
  sketchTo3d: "sketch-tool-sketch-to-3d.png",
  editSketchTo3d: "sketch-tool-edit-sketch-to-3d.png",
} as const;

type SketchReferenceIconName = keyof typeof sketchReferenceIcons;

function SketchReferenceIcon({ name }: { name: SketchReferenceIconName }) {
  return (
    <img
      aria-hidden="true"
      className="sketch-reference-icon"
      data-sketch-icon={name}
      draggable={false}
      src={`/assets/editor/${sketchReferenceIcons[name]}`}
      alt=""
    />
  );
}

const sketchShapeMenuItems = [
  { primitive: "rectangle", label: "sketch.rectangle", icon: SquareIcon },
  { primitive: "circle", label: "sketch.circle", icon: CircleIcon },
  { primitive: "ellipse", label: "sketch.ellipse", icon: SketchEllipseIcon },
  { primitive: "halfCircle", label: "sketch.halfCircle", icon: SketchHalfCircleIcon },
  { primitive: "pieSlice", label: "sketch.pieSlice", icon: SketchPieSliceIcon },
  { primitive: "triangle", label: "sketch.triangle", icon: TriangleIcon },
  { primitive: "hexagon", label: "sketch.hexagon", icon: HexagonIcon },
  { primitive: "boltCircle", label: "sketch.boltCircle", icon: SketchBoltCircleIcon },
] satisfies Array<{ primitive: SketchPrimitive; label: MessageKey; icon: ComponentType<SVGProps<SVGSVGElement>> }>;

/** The keys that do what a toolbar button does, shown beside it in the command search. */
const COMMAND_SHORTCUTS: Readonly<Record<string, string>> = {
  copy: "Ctrl+C",
  paste: "Ctrl+V",
  duplicate: "Ctrl+D",
  delete: "Delete",
  undo: "Ctrl+Z",
  redo: "Ctrl+Y",
  outliner: "Ctrl+Shift+O",
  "toggle-hidden": "Ctrl+H",
  "show-hidden": "Ctrl+Shift+H",
  group: "Ctrl+G",
  bundle: "Ctrl+B",
  ungroup: "Ctrl+Shift+G",
  align: "L",
  mirror: "M",
  drop: "D",
  note: "N",
  import: "Ctrl+I",
  export: "Ctrl+E",
  "sketch-copy": "Ctrl+C",
  "sketch-paste": "Ctrl+V",
  "sketch-duplicate": "Ctrl+D",
  "sketch-delete": "Delete",
  "sketch-undo": "Ctrl+Z",
  "sketch-redo": "Ctrl+Y",
};

type SketchIconName = Parameters<typeof SketchReferenceIcon>[0]["name"];

/** A sketch tool's picture as a component of its own, for the command search. */
function sketchPaletteIcon(name: SketchIconName) {
  return function SketchPaletteIcon() {
    return <SketchReferenceIcon name={name} />;
  };
}

const SKETCH_PALETTE_ICONS = {
  line: sketchPaletteIcon("line"),
  bezier: sketchPaletteIcon("bezier"),
  smooth: sketchPaletteIcon("smooth"),
  select: sketchPaletteIcon("select"),
  image: sketchPaletteIcon("image"),
  refine: sketchPaletteIcon("refine"),
  erase: sketchPaletteIcon("erase"),
};

function SecondaryToolbar({
  toolbarMode,
  projectName,
  onProjectNameChange,
  onToolbarModeChange,
  outlinerOpen,
  onToggleOutliner,
  alignMode,
  canAlign,
  canEdgeModify,
  edgeModifierKind,
  canGroup,
  canIntersect,
  canRedo,
  canUngroup,
  canUndo,
  canHistoryView,
  historyViewActive,
  onHistoryView,
  hasClipboard,
  hasSelection,
  hiddenShapeCount,
  selectionHidden,
  mirrorMode,
  canSplit,
  splitMode,
  sketchActive,
  sketchOperation,
  sketchTool,
  sketchCanUndo,
  sketchCanRedo,
  sketchHasSelection,
  sketchHasClipboard,
  canEditSketch,
  canFilletSketchPoint,
  sketchCornerDialog,
  onSketchCornerDialog,
  sketchStrokeActive,
  onSketchStroke,
  onStartSketch,
  onEditSketch,
  onSketchTool,
  onSketchPrimitive,
  onSketchImage,
  onSketchCopy,
  onSketchPaste,
  onSketchDuplicate,
  onSketchDelete,
  onSketchUndo,
  onSketchRedo,
  onSketchFinish,
  onSketchCancel,
  onHome,
  onAlign,
  onChamfer,
  onCopy,
  onDelete,
  onDuplicate,
  onCenterOnWorkplane,
  onDropToWorkplane,
  onLayFlat,
  layFlatActive,
  onMateFaces,
  mateFacesActive,
  onGroup,
  onBundle,
  onIntersect,
  onFillet,
  onHollow,
  hollowActive,
  canSimplify,
  onSimplify,
  simplifyActive,
  onMirror,
  onRotationPivot,
  rotationPivotActive,
  onArray,
  arrayActive,
  onScalePercent,
  scalePercentActive,
  onSplit,
  onPaste,
  onRedo,
  onSnap,
  onShowHidden,
  onToggleHidden,
  onUngroup,
  onUndo,
  onTopPanel,
  onAddShape,
  onShortcuts,
  onGuide,
  noteMode,
  notesVisible,
  noteCount,
  onNoteTool,
  onToggleNotes,
  overhangsVisible,
  overhangAngle,
  onToggleOverhangs,
  renderMyShapes,
  objects,
  onSelectObject,
}: {
  toolbarMode: ToolbarMode;
  projectName: string;
  onProjectNameChange?: (name: string) => void;
  onToolbarModeChange: (mode: ToolbarMode) => void;
  outlinerOpen: boolean;
  onToggleOutliner: () => void;
  alignMode: boolean;
  canAlign: boolean;
  canEdgeModify: boolean;
  edgeModifierKind: CadModifierKind | null;
  canGroup: boolean;
  canIntersect: boolean;
  canRedo: boolean;
  canUngroup: boolean;
  canUndo: boolean;
  canHistoryView: boolean;
  historyViewActive: boolean;
  onHistoryView: () => void;
  hasClipboard: boolean;
  hasSelection: boolean;
  hiddenShapeCount: number;
  selectionHidden: boolean;
  mirrorMode: boolean;
  canSplit: boolean;
  splitMode: boolean;
  sketchActive: boolean;
  sketchOperation: SketchOperation;
  sketchTool: SketchTool;
  sketchCanUndo: boolean;
  sketchCanRedo: boolean;
  sketchHasSelection: boolean;
  sketchHasClipboard: boolean;
  canEditSketch: boolean;
  canFilletSketchPoint?: boolean;
  sketchCornerDialog?: "fillet" | "chamfer" | null;
  onSketchCornerDialog?: (dialog: "fillet" | "chamfer" | null) => void;
  sketchStrokeActive?: boolean;
  onSketchStroke?: () => void;
  onStartSketch: (operation: SketchOperation) => void;
  onEditSketch: () => void;
  onSketchTool: (tool: SketchTool) => void;
  onSketchPrimitive: (primitive: SketchPrimitive) => void;
  onSketchImage: () => void;
  onSketchCopy: () => void;
  onSketchPaste: () => void;
  onSketchDuplicate: () => void;
  onSketchDelete: () => void;
  onSketchUndo: () => void;
  onSketchRedo: () => void;
  onSketchFinish: () => void;
  onSketchCancel: () => void;
  onHome?: () => void;
  onAlign: () => void;
  onChamfer: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onCenterOnWorkplane: () => void;
  onDropToWorkplane: () => void;
  onLayFlat: () => void;
  layFlatActive: boolean;
  onMateFaces: () => void;
  mateFacesActive: boolean;
  onGroup: () => void;
  onBundle: () => void;
  onIntersect: () => void;
  onFillet: () => void;
  onHollow: () => void;
  hollowActive: boolean;
  canSimplify: boolean;
  onSimplify: () => void;
  simplifyActive: boolean;
  onMirror: () => void;
  onRotationPivot: () => void;
  rotationPivotActive: boolean;
  onArray: () => void;
  arrayActive: boolean;
  onScalePercent: () => void;
  scalePercentActive: boolean;
  onSplit: () => void;
  onPaste: () => void;
  onRedo: () => void;
  onSnap: () => void;
  onShowHidden: () => void;
  onToggleHidden: () => void;
  onUngroup: () => void;
  onUndo: () => void;
  onTopPanel: (panel: TopPanel) => void;
  onAddShape: (shape: ShapeAsset) => void;
  onShortcuts: () => void;
  onGuide: () => void;
  noteMode: boolean;
  notesVisible: boolean;
  noteCount: number;
  onNoteTool: () => void;
  onToggleNotes: () => void;
  overhangsVisible: boolean;
  overhangAngle: number;
  onToggleOverhangs: () => void;
  /** Custom shapes above the library; gets the way to close the menu. */
  renderMyShapes?: (close: () => void) => ReactNode;
  /** The bodies of the design, so the command search can find them by name. */
  objects: ReadonlyArray<{ id: string; name: string; kind: string; hidden: boolean }>;
  onSelectObject: (id: string) => void;
}) {
  const [shapesOpen, setShapesOpen] = useState(false);
  const [sketchCreateOpen, setSketchCreateOpen] = useState(false);
  // On a narrow window the tools wrap onto more rows. Their real height goes
  // into --editor-toolbar-height, which the workplane, the status and the menus
  // below the bar are placed by.
  const toolbarContentRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const content = toolbarContentRef.current;
    if (!content || typeof ResizeObserver === "undefined") return;
    const root = document.documentElement;
    const apply = () => {
      const styles = getComputedStyle(root);
      const title = parseFloat(styles.getPropertyValue("--editor-toolbar-title-height")) || 44;
      const minimum = parseFloat(styles.getPropertyValue("--editor-toolbar-tools-height")) || 76;
      const tools = content.offsetHeight;
      // A hidden editor measures nothing; it keeps the one-row height.
      root.style.setProperty("--editor-toolbar-height", `${Math.round(title + Math.max(minimum, tools))}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(content);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--editor-toolbar-height");
    };
  }, []);
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const [visibilityMenuPosition, setVisibilityMenuPosition] = useState({ top: 0, left: 0 });
  const shapesMenuRef = useRef<HTMLDivElement>(null);
  const sketchCreateMenuRef = useRef<HTMLDivElement>(null);
  const visibilityMenuRef = useRef<HTMLDivElement>(null);
  const touchShapeStartRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const suppressNextShapeClickRef = useRef(false);
  const cancelProjectNameEditRef = useRef(false);
  const projectNameFieldRef = useRef<HTMLLabelElement>(null);
  const projectNameInputRef = useRef<HTMLInputElement>(null);
  const [projectNameDraft, setProjectNameDraft] = useState(projectName);
  useEffect(() => {
    setProjectNameDraft(projectName);
  }, [projectName]);
  useEffect(() => {
    const finishProjectNameEdit = (event: PointerEvent) => {
      const input = projectNameInputRef.current;
      if (input && document.activeElement === input && !projectNameFieldRef.current?.contains(event.target as Node)) {
        input.blur();
      }
    };
    document.addEventListener("pointerdown", finishProjectNameEdit, true);
    return () => document.removeEventListener("pointerdown", finishProjectNameEdit, true);
  }, []);
  const commitProjectName = (value: string) => {
    const nextName = value.trim().slice(0, 80);
    if (!nextName) {
      setProjectNameDraft(projectName);
      return;
    }
    setProjectNameDraft(nextName);
    if (nextName !== projectName) onProjectNameChange?.(nextName);
  };
  const selectToolbarMode = (mode: "geometry" | "sketch") => {
    setShapesOpen(false);
    setSketchCreateOpen(false);
    setVisibilityOpen(false);
    onTopPanel(null);
    onToolbarModeChange(mode);
  };
  const addShapeFromMenu = (shape: ShapeAsset) => {
    onAddShape({ ...shape, name: shapeAssetLabel(shape) });
    setShapesOpen(false);
  };
  const addSketchShapeFromMenu = (primitive: SketchPrimitive) => {
    onSketchPrimitive(primitive);
    setShapesOpen(false);
  };
  const startSketch = (operation: SketchOperation) => {
    setSketchCreateOpen(false);
    onStartSketch(operation);
  };
  useEffect(() => {
    if (!historyViewActive) return;
    setShapesOpen(false);
    setVisibilityOpen(false);
  }, [historyViewActive]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const openPalette = () => {
    setShapesOpen(false);
    setSketchCreateOpen(false);
    setVisibilityOpen(false);
    setPaletteOpen(true);
  };
  const openPaletteRef = useRef(openPalette);
  openPaletteRef.current = openPalette;
  useEffect(() => {
    // Ctrl/Cmd+K opens the command search from anywhere in the editor, also
    // while a field has the focus - the browsers' own use of the key (a search
    // bar) is not worth keeping here.
    const openOnShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey || event.key.toLowerCase() !== "k") return;
      event.preventDefault();
      openPaletteRef.current();
    };
    window.addEventListener("keydown", openOnShortcut);
    return () => window.removeEventListener("keydown", openOnShortcut);
  }, []);
  useEffect(() => {
    if (!sketchCreateOpen) return;
    const closeOnPointerDown = (event: PointerEvent) => {
      if (!sketchCreateMenuRef.current?.contains(event.target as Node)) setSketchCreateOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSketchCreateOpen(false);
    };
    window.addEventListener("pointerdown", closeOnPointerDown);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOnPointerDown);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [sketchCreateOpen]);
  useEffect(() => {
    if (sketchActive) setSketchCreateOpen(false);
    else setShapesOpen(false);
  }, [sketchActive]);
  useEffect(() => {
    if (!shapesOpen) return;
    const closeOnPointerDown = (event: PointerEvent) => {
      if (!shapesMenuRef.current?.contains(event.target as Node)) setShapesOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShapesOpen(false);
    };
    window.addEventListener("pointerdown", closeOnPointerDown);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOnPointerDown);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [shapesOpen]);
  useEffect(() => {
    if (!visibilityOpen) return;
    const closeOnPointerDown = (event: PointerEvent) => {
      if (!visibilityMenuRef.current?.contains(event.target as Node)) setVisibilityOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setVisibilityOpen(false);
    };
    const closeOnViewportChange = () => setVisibilityOpen(false);
    window.addEventListener("pointerdown", closeOnPointerDown);
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeOnViewportChange);
    window.addEventListener("scroll", closeOnViewportChange, true);
    return () => {
      window.removeEventListener("pointerdown", closeOnPointerDown);
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeOnViewportChange);
      window.removeEventListener("scroll", closeOnViewportChange, true);
    };
  }, [visibilityOpen]);
  const toggleVisibilityMenu = () => {
    if (visibilityOpen) {
      setVisibilityOpen(false);
      return;
    }
    const triggerBounds = visibilityMenuRef.current?.getBoundingClientRect();
    if (triggerBounds) {
      const viewportGutter = 12;
      const menuWidth = Math.min(276, Math.max(0, window.innerWidth - viewportGutter * 2));
      setVisibilityMenuPosition({
        top: triggerBounds.bottom + 8,
        left: Math.max(
          viewportGutter,
          Math.min(
            triggerBounds.left + triggerBounds.width / 2 - menuWidth / 2,
            window.innerWidth - menuWidth - viewportGutter,
          ),
        ),
      });
    }
    setShapesOpen(false);
    setSketchCreateOpen(false);
    onTopPanel(null);
    setVisibilityOpen(true);
  };
  // Die Leiste haengt an der Sprache: ohne dieses Abonnement bliebe sie stehen,
  // falls sie spaeter einmal memoisiert wird.
  useLanguage();
  const leftTools = [
    { id: "copy", label: t("editor.tool.copy"), icon: ToolbarCopyIcon, action: onCopy, enabled: hasSelection },
    { id: "paste", label: t("editor.tool.paste"), icon: ToolbarPasteIcon, action: onPaste, enabled: hasClipboard },
    { id: "duplicate", label: t("editor.tool.duplicate"), icon: ToolbarDuplicateIcon, action: onDuplicate, enabled: hasSelection },
    { id: "delete", label: t("editor.tool.delete"), icon: ToolbarTrashIcon, action: onDelete, enabled: hasSelection },
    { id: "undo", label: t("editor.tool.undo"), icon: ToolbarUndoIcon, action: onUndo, enabled: canUndo },
    { id: "redo", label: t("editor.tool.redo"), icon: ToolbarRedoIcon, action: onRedo, enabled: canRedo },
    { id: "history", label: t("editor.tool.history"), icon: ToolbarHistoryIcon, action: onHistoryView, enabled: canHistoryView, active: historyViewActive },
  ];
  const visibilityTools = [
    {
      id: "outliner",
      label: outlinerOpen ? t("editor.tool.hideOutliner") : t("editor.tool.showOutliner"),
      icon: ListTree,
      action: () => {
        setVisibilityOpen(false);
        onToggleOutliner();
      },
      enabled: true,
      active: outlinerOpen,
    },
    {
      id: "toggle-hidden",
      label: selectionHidden ? t("editor.tool.showSelected") : t("editor.tool.hideSelected"),
      icon: ToolbarHideSelectedIcon,
      action: () => {
        setVisibilityOpen(false);
        onToggleHidden();
      },
      enabled: hasSelection,
    },
  ];
  const combineTools = [
    { id: "group", label: t("editor.tool.group"), icon: ToolbarGroupIcon, action: onGroup, enabled: canGroup },
    { id: "bundle", label: t("editor.tool.bundle"), icon: ToolbarBundleIcon, action: onBundle, enabled: canGroup },
    { id: "ungroup", label: t("editor.tool.ungroup"), icon: ToolbarUngroupIcon, action: onUngroup, enabled: canUngroup },
    { id: "intersect", label: t("editor.tool.intersect"), icon: ToolbarIntersectionIcon, action: onIntersect, enabled: canIntersect },
  ];
  const modifyTools = [
    { id: "align", label: t("editor.tool.align"), icon: ToolbarAlignIcon, action: onAlign, enabled: canAlign, active: alignMode },
    { id: "mirror", label: t("editor.tool.mirror"), icon: ToolbarMirrorIcon, action: onMirror, enabled: hasSelection, active: mirrorMode },
    { id: "pivot", label: t("editor.tool.rotationPivot"), icon: ToolbarRotationPivotIcon, action: onRotationPivot, enabled: hasSelection, active: rotationPivotActive },
    { id: "array", label: t("editor.tool.array"), icon: ToolbarPatternIcon, action: onArray, enabled: hasSelection, active: arrayActive },
    { id: "split", label: t("editor.tool.split"), icon: ToolbarSplitIcon, action: onSplit, enabled: splitMode || canSplit, active: splitMode },
    { id: "snap", label: t("editor.tool.snapToGrid"), icon: ToolbarSnapGridIcon, action: onSnap, enabled: hasSelection },
    { id: "chamfer", label: t("editor.tool.chamfer"), icon: ToolbarChamferIcon, action: onChamfer, enabled: canEdgeModify, active: edgeModifierKind === "chamfer" },
    { id: "fillet", label: t("editor.tool.fillet"), icon: ToolbarFilletIcon, action: onFillet, enabled: canEdgeModify, active: edgeModifierKind === "fillet" },
    { id: "hollow", label: t("editor.tool.hollow"), icon: ToolbarHollowIcon, action: onHollow, enabled: canEdgeModify, active: hollowActive },
    { id: "simplify", label: t("editor.tool.simplify"), icon: ToolbarSimplifyIcon, action: onSimplify, enabled: canSimplify, active: simplifyActive },
  ];
  const arrangeTools = [
    { id: "drop", label: t("editor.tool.dropToWorkplane"), icon: ToolbarDropToWorkplaneIcon, action: onDropToWorkplane, enabled: hasSelection },
    { id: "layFlat", label: t("editor.tool.layFlat"), icon: ToolbarLayFlatIcon, action: onLayFlat, enabled: hasSelection, active: layFlatActive },
    { id: "mateFaces", label: t("editor.tool.mateFaces"), icon: ToolbarMateFacesIcon, action: onMateFaces, enabled: hasSelection, active: mateFacesActive },
    { id: "center", label: t("editor.tool.centerOnWorkplane"), icon: ToolbarCenterOnWorkplaneIcon, action: onCenterOnWorkplane, enabled: hasSelection },
  ];
  const sketchClipboardTools = [
    { id: "sketch-copy", label: t("editor.tool.copy"), icon: ToolbarCopyIcon, action: onSketchCopy, enabled: sketchHasSelection },
    { id: "sketch-paste", label: t("editor.tool.paste"), icon: ToolbarPasteIcon, action: onSketchPaste, enabled: sketchHasClipboard },
    { id: "sketch-duplicate", label: t("editor.tool.duplicate"), icon: ToolbarDuplicateIcon, action: onSketchDuplicate, enabled: sketchHasSelection },
    { id: "sketch-delete", label: t("editor.tool.delete"), icon: ToolbarTrashIcon, action: onSketchDelete, enabled: sketchHasSelection },
  ];
  const renderToolButton = (tool: (typeof leftTools)[number] | (typeof visibilityTools)[number] | (typeof combineTools)[number] | (typeof modifyTools)[number] | (typeof arrangeTools)[number]) => {
    const { id, icon: Icon, action, label } = tool;
    // Im Verlaufsblick schlaeft jedes Werkzeug ausser dem, das ihn beendet -
    // wirklich, nicht nur im Aussehen: eine Auswahl aus der Zeit davor darf
    // kein Loeschen freischalten, waehrend die Flaeche etwas anderes zeigt.
    const enabled = tool.enabled && (!historyViewActive || id === "history");
    const active = "active" in tool && Boolean(tool.active);
    return (
      <button
        className={`toolbar-icon ${enabled ? "" : "disabled"} ${active ? "active" : ""}`}
        key={id}
        data-layerling-tool={id}
        aria-label={label}
        title={label}
        onClick={action}
        disabled={!enabled}
      >
        <Icon />
      </button>
    );
  };

  // Everything the toolbar and its menus can do, as entries of the command
  // search. Built from the same lists as the buttons, so a new tool shows up in
  // both without a second place to remember; only built while the search is open.
  const buildPaletteCommands = (): PaletteCommand[] => buildAllPaletteCommands().map((command) =>
    historyViewActive && !HISTORY_VIEW_COMMANDS.has(command.id) ? { ...command, enabled: false } : command,
  );
  const buildAllPaletteCommands = (): PaletteCommand[] => {
    const fromTool = (
      tool: { id: string; label: string; icon: PaletteCommand["icon"]; action: () => void; enabled: boolean; active?: boolean },
      group: string,
    ): PaletteCommand => ({
      id: tool.id,
      label: tool.label,
      group,
      keywords: COMMAND_KEYWORDS[tool.id],
      shortcut: COMMAND_SHORTCUTS[tool.id],
      icon: tool.icon,
      enabled: tool.enabled,
      active: tool.active,
      run: () => tool.action(),
    });
    const plain = (
      id: string,
      label: string,
      group: string,
      enabled: boolean,
      run: () => void,
      extra: Partial<PaletteCommand> = {},
    ): PaletteCommand => ({ id, label, group, keywords: COMMAND_KEYWORDS[id], shortcut: COMMAND_SHORTCUTS[id], enabled, run, ...extra });
    const helpGroup = t("editor.group.help");
    const helpCommands = [
      plain("guide", t("editor.guide"), helpGroup, true, onGuide, { icon: ToolbarGuideIcon }),
      plain("shortcuts", t("editor.keyboardShortcuts"), helpGroup, true, onShortcuts, { icon: ToolbarKeyboardIcon }),
    ];
    if (toolbarMode === "sketch") {
      const modeGroup = t("palette.group.mode");
      const modeCommand = plain("mode-geometry", t("palette.switchGeometry"), modeGroup, true, () => selectToolbarMode("geometry"));
      if (!sketchActive) {
        const createGroup = t("sketch.group.create");
        return [
          plain("sketch-extrude", t("sketch.extrude"), createGroup, true, () => startSketch("extrude")),
          plain("sketch-revolve", t("sketch.revolve"), createGroup, true, () => startSketch("revolve")),
          plain("sketch-edit", t("sketch.editTo3d"), createGroup, canEditSketch, onEditSketch),
          modeCommand,
          ...helpCommands,
        ];
      }
      const drawGroup = t("sketch.group.draw");
      const selectGroup = t("sketch.group.select");
      const finishGroup = t("sketch.group.finish");
      return [
        plain("sketch-line", t("sketch.line"), drawGroup, true, () => onSketchTool("line"), { icon: SKETCH_PALETTE_ICONS.line, active: sketchTool === "line" }),
        plain("sketch-bezier", t("sketch.bezier"), drawGroup, true, () => onSketchTool("bezier"), { icon: SKETCH_PALETTE_ICONS.bezier, active: sketchTool === "bezier" }),
        plain("sketch-smooth", t("sketch.smooth"), drawGroup, true, () => onSketchTool("smooth"), { icon: SKETCH_PALETTE_ICONS.smooth, active: sketchTool === "smooth" }),
        ...sketchShapeMenuItems.map(({ primitive, label, icon }) => plain(
          `sketch-shape-${primitive}`,
          t("palette.addShape", { shape: t(label) }),
          t("sketch.group.shapes"),
          true,
          () => onSketchPrimitive(primitive),
          { icon, keywords: [primitive] },
        )),
        plain("sketch-select", t("sketch.select"), selectGroup, true, () => onSketchTool("select"), { icon: SKETCH_PALETTE_ICONS.select, active: sketchTool === "select" }),
        plain("sketch-image", t("sketch.addImage"), selectGroup, sketchTool === "select", onSketchImage, { icon: SKETCH_PALETTE_ICONS.image }),
        plain("sketch-refine", t("sketch.refine"), selectGroup, true, () => onSketchTool("refine"), { icon: SKETCH_PALETTE_ICONS.refine, active: sketchTool === "refine" }),
        plain("sketch-fillet", t("sketch.filletCorner"), selectGroup, Boolean(canFilletSketchPoint), () => onSketchCornerDialog?.(sketchCornerDialog === "fillet" ? null : "fillet"), { icon: ToolbarFilletIcon, active: sketchCornerDialog === "fillet" }),
        plain("sketch-chamfer", t("sketch.chamferCorner"), selectGroup, Boolean(canFilletSketchPoint), () => onSketchCornerDialog?.(sketchCornerDialog === "chamfer" ? null : "chamfer"), { icon: ToolbarChamferIcon, active: sketchCornerDialog === "chamfer" }),
        plain("sketch-erase", t("sketch.erase"), selectGroup, true, () => onSketchTool("erase"), { icon: SKETCH_PALETTE_ICONS.erase, active: sketchTool === "erase" }),
        ...sketchClipboardTools.map((tool) => fromTool(tool, t("editor.group.clipboard"))),
        plain("sketch-undo", t("editor.tool.undo"), t("editor.group.history"), sketchCanUndo, onSketchUndo, { icon: ToolbarUndoIcon }),
        plain("sketch-redo", t("editor.tool.redo"), t("editor.group.history"), sketchCanRedo, onSketchRedo, { icon: ToolbarRedoIcon }),
        ...(sketchOperation === "revolve" ? [] : [plain("sketch-stroke", t("sketch.strokeHint"), finishGroup, true, () => onSketchStroke?.(), { icon: SKETCH_PALETTE_ICONS.line, active: Boolean(sketchStrokeActive) })]),
        plain("sketch-finish", sketchOperation === "revolve" ? t("sketch.finishRevolve") : t("sketch.finishSketch"), finishGroup, true, onSketchFinish),
        plain("sketch-cancel", t("sketch.cancel"), finishGroup, true, onSketchCancel),
        modeCommand,
        ...helpCommands,
      ];
    }
    const shapesGroup = t("editor.group.shapes");
    const visibilityGroup = t("editor.group.visibility");
    const manageGroup = t("editor.group.manage");
    return [
      ...leftTools.slice(0, 4).map((tool) => fromTool(tool, t("editor.group.clipboard"))),
      ...leftTools.slice(4).map((tool) => fromTool(tool, t("editor.group.history"))),
      ...libraryShapeAssets.map((shape) => plain(
        `shape-${shape.id}`,
        t("palette.addShape", { shape: shapeAssetMenuLabel(shape) }),
        shapesGroup,
        true,
        () => addShapeFromMenu(shape),
        { image: shape.menuIcon, keywords: [shape.id, shape.name, ...(SHAPE_KEYWORDS[shape.id] ?? [])] },
      )),
      ...visibilityTools.map((tool) => fromTool(tool, visibilityGroup)),
      plain(
        "show-hidden",
        hiddenShapeCount === 0 ? t("visibility.nothingHidden") : t("visibility.showAllHidden", { count: hiddenShapeCount }),
        visibilityGroup,
        hiddenShapeCount > 0,
        onShowHidden,
        { icon: Eye },
      ),
      plain("notes", t("visibility.notes"), visibilityGroup, noteCount > 0, onToggleNotes, { icon: notesVisible ? Eye : EyeOff, active: notesVisible }),
      plain("overhangs", t("visibility.overhangs", { angle: overhangAngle }), visibilityGroup, true, onToggleOverhangs, { icon: AlertTriangle, active: overhangsVisible }),
      ...combineTools.map((tool) => fromTool(tool, t("editor.group.combine"))),
      ...modifyTools.map((tool) => fromTool(tool, t("editor.group.modify"))),
      plain("scalePercent", t("scalePercent.title"), t("editor.group.modify"), hasSelection, onScalePercent, { icon: Percent, active: scalePercentActive }),
      ...arrangeTools.map((tool) => fromTool(tool, t("editor.group.arrange"))),
      plain("note", t("editor.tool.note"), manageGroup, true, onNoteTool, { icon: ToolbarNoteIcon, active: noteMode }),
      plain("import", t("editor.import"), manageGroup, true, () => onTopPanel("import"), { icon: ToolbarImportIcon }),
      plain("export", t("editor.export"), manageGroup, true, () => onTopPanel("export"), { icon: ToolbarVectorExportIcon }),
      plain("settings", t("editor.workspaceSettings"), manageGroup, true, () => window.dispatchEvent(new Event("layerling:open-workspace-settings")), { icon: ToolbarSettingsIcon }),
      plain("mode-sketch", t("palette.switchSketch"), t("palette.group.mode"), true, () => selectToolbarMode("sketch")),
      ...helpCommands,
      ...objects.map((object) => plain(
        `object-${object.id}`,
        t("palette.selectObject", { name: object.name }),
        t("palette.group.objects"),
        true,
        () => onSelectObject(object.id),
        { keywords: [object.name, object.kind, ...(object.hidden ? ["hidden", "ausgeblendet", "versteckt"] : [])], searchOnly: true, transient: true },
      )),
    ];
  };

  return (
    <div className="secondary-toolbar">
      {paletteOpen ? <CommandPalette commands={buildPaletteCommands()} onClose={() => setPaletteOpen(false)} /> : null}
      <div ref={toolbarContentRef} className={`toolbar-mode-content ${toolbarMode}`}>
        {toolbarMode === "geometry" ? (
          <>
      {onHome ? (
        <div className="tool-group editor-nav-group">
          <div className="toolbar-section toolbar-home-section" data-group="home">
            <div className="toolbar-section-label">{t("editor.group.home")}</div>
            <div className="toolbar-section-tools">
              <button className="toolbar-icon editor-home-control" aria-label={t("editor.homeDashboard")} title={t("editor.homeDashboard")} onClick={onHome}>
                <ToolbarHomeIcon />
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="tool-group left">
        <div className="toolbar-section" data-group="clipboard" inert={historyViewActive}>
          <div className="toolbar-section-label">{t("editor.group.clipboard")}</div>
          <div className="toolbar-section-tools">{leftTools.slice(0, 4).map(renderToolButton)}</div>
        </div>
        <div className="toolbar-section" data-group="history">
          <div className="toolbar-section-label">{t("editor.group.history")}</div>
          <div className="toolbar-section-tools">{leftTools.slice(4).map(renderToolButton)}</div>
        </div>
        <div className="toolbar-section toolbar-shapes-section" data-group="shapes" ref={shapesMenuRef} inert={historyViewActive}>
          <div className="toolbar-section-label">{t("editor.group.shapes")}</div>
          <div className="toolbar-section-tools">
            <button
              className={`shape-menu-trigger ${shapesOpen ? "active" : ""}`}
              aria-label={t("editor.addShape")}
              aria-expanded={shapesOpen}
              onClick={() => {
                setVisibilityOpen(false);
                setShapesOpen((value) => !value);
              }}
            >
              <ToolbarShapeAddIcon />
            </button>
          </div>
          {shapesOpen ? (
            <div className="shape-menu-dropdown">
              <div className="shape-menu-title">
                {t("shape.basicShapes")}
                <GuideHelpLink section="addShape" />
              </div>
              <div className="shape-menu-body">
              {renderMyShapes ? (
                <>
                  {renderMyShapes(() => setShapesOpen(false))}
                  <div className="shape-menu-subtitle">{t("myShapes.basicShapes")}</div>
                </>
              ) : null}
              <div className="shape-menu-list">
                {libraryShapeAssets.map((shape) => (
                  <button
                    className="shape-menu-item"
                    key={shape.id}
                    type="button"
                    draggable
                    onClick={() => {
                      if (suppressNextShapeClickRef.current) {
                        suppressNextShapeClickRef.current = false;
                        return;
                      }
                      addShapeFromMenu(shape);
                    }}
                    onPointerDown={(event) => {
                      if (event.pointerType === "touch") {
                        touchShapeStartRef.current = { id: shape.id, x: event.clientX, y: event.clientY };
                      }
                    }}
                    onPointerUp={(event) => {
                      if (event.pointerType !== "touch") {
                        return;
                      }
                      const start = touchShapeStartRef.current;
                      touchShapeStartRef.current = null;
                      if (!start || start.id !== shape.id || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) {
                        return;
                      }
                      event.preventDefault();
                      suppressNextShapeClickRef.current = true;
                      window.setTimeout(() => {
                        suppressNextShapeClickRef.current = false;
                      }, 350);
                      addShapeFromMenu(shape);
                    }}
                    onTouchStart={(event) => {
                      const touch = event.changedTouches[0];
                      if (touch) {
                        touchShapeStartRef.current = { id: shape.id, x: touch.clientX, y: touch.clientY };
                      }
                    }}
                    onTouchEnd={(event) => {
                      const touch = event.changedTouches[0];
                      const start = touchShapeStartRef.current;
                      touchShapeStartRef.current = null;
                      if (!touch || !start || start.id !== shape.id || Math.hypot(touch.clientX - start.x, touch.clientY - start.y) > 8) {
                        return;
                      }
                      event.preventDefault();
                      suppressNextShapeClickRef.current = true;
                      window.setTimeout(() => {
                        suppressNextShapeClickRef.current = false;
                      }, 350);
                      addShapeFromMenu(shape);
                    }}
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "copy";
                      event.dataTransfer.setData("application/x-layerling-shape", JSON.stringify(shape));
                    }}
                    onDragEnd={() => setShapesOpen(false)}
                  >
                    <img src={shape.menuIcon} alt="" draggable={false} />
                    <span className={shapeAssetMenuLabel(shape).split(/\s+/).some((word) => word.length > 13) ? "long-word" : undefined}>{shapeAssetMenuLabel(shape)}</span>
                  </button>
                ))}
              </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <div className="toolbar-spacer" />
      <div className="tool-group right" inert={historyViewActive}>
        <div className="toolbar-section compact toolbar-visibility-section" data-group="visibility" ref={visibilityMenuRef}>
          <div className="toolbar-section-label">{t("editor.group.visibility")}</div>
          <div className="toolbar-section-tools">
            {visibilityTools.map(renderToolButton)}
            <button
              className={`toolbar-icon visibility-menu-trigger ${visibilityOpen ? "active" : ""}`}
              type="button"
              aria-label={t("editor.visibilityOptions")}
              title={t("editor.visibilityOptions")}
              aria-haspopup="menu"
              aria-expanded={visibilityOpen}
              onClick={toggleVisibilityMenu}
            >
              <ToolbarCaretDownIcon />
            </button>
          </div>
          {visibilityOpen ? (
            <div
              className="visibility-dropdown"
              role="menu"
              aria-label={t("editor.visibilityOptions")}
              style={visibilityMenuPosition}
            >
              <button
                className="visibility-dropdown-action"
                type="button"
                role="menuitem"
                onClick={() => {
                  setVisibilityOpen(false);
                  onToggleOutliner();
                }}
              >
                <ListTree size={20} aria-hidden="true" />
                <strong>{outlinerOpen ? t("visibility.hideOutliner") : t("visibility.showOutliner")}</strong>
              </button>
              <button
                className="visibility-dropdown-action"
                type="button"
                role="menuitem"
                disabled={hiddenShapeCount === 0}
                onClick={() => {
                  setVisibilityOpen(false);
                  onShowHidden();
                }}
              >
                <Eye size={20} aria-hidden="true" />
                <strong>{hiddenShapeCount === 0
                  ? t("visibility.nothingHidden")
                  : t("visibility.showAllHidden", { count: hiddenShapeCount })}</strong>
              </button>
              <button
                className="visibility-dropdown-action"
                type="button"
                role="menuitemcheckbox"
                aria-checked={notesVisible}
                disabled={noteCount === 0}
                onClick={() => {
                  setVisibilityOpen(false);
                  onToggleNotes();
                }}
              >
                {notesVisible ? <Eye size={20} aria-hidden="true" /> : <EyeOff size={20} aria-hidden="true" />}
                <strong>{t("visibility.notes")}{noteCount > 0 ? ` (${noteCount})` : ""}</strong>
              </button>
              <button
                className="visibility-dropdown-action"
                type="button"
                role="menuitemcheckbox"
                aria-checked={overhangsVisible}
                onClick={() => {
                  setVisibilityOpen(false);
                  onToggleOverhangs();
                }}
              >
                <AlertTriangle size={20} aria-hidden="true" className={overhangsVisible ? "overhang-menu-icon active" : "overhang-menu-icon"} />
                <strong>{t("visibility.overhangs", { angle: overhangAngle })}</strong>
              </button>
              <div className="visibility-dropdown-help">
                <span>{t("visibility.eyeAgain")}</span>
                <span aria-hidden="true">·</span>
                <span><kbd>Ctrl/Cmd</kbd> + <kbd>Shift</kbd> + <kbd>H</kbd>{t("visibility.allShortcut")}</span>
                <GuideHelpLink section="selecting" iconSize={14} />
              </div>
            </div>
          ) : null}
        </div>
        <div className="toolbar-section" data-group="combine">
          <div className="toolbar-section-label">{t("editor.group.combine")}</div>
          <div className="toolbar-section-tools">{combineTools.map(renderToolButton)}</div>
        </div>
        <div className="toolbar-section" data-group="modify">
          <div className="toolbar-section-label">{t("editor.group.modify")}</div>
          <div className="toolbar-section-tools">{modifyTools.map(renderToolButton)}</div>
        </div>
        <div className="toolbar-section" data-group="arrange">
          <div className="toolbar-section-label">{t("editor.group.arrange")}</div>
          <div className="toolbar-section-tools">{arrangeTools.map(renderToolButton)}</div>
        </div>
      </div>
      <div className="toolbar-section toolbar-actions-section" data-group="manage">
        <div className="toolbar-section-label">{t("editor.group.manage")}</div>
        <div className="action-buttons">
          <button
            className={`action-icon-button ${noteMode ? "active" : ""}`}
            aria-label={t("editor.tool.note")}
            aria-pressed={noteMode}
            title={t("editor.tool.note")}
            onClick={onNoteTool}
            disabled={historyViewActive}
          >
            <ToolbarNoteIcon />
          </button>
          <button className="action-icon-button" aria-label={t("editor.import")} title={t("editor.import")} onClick={() => onTopPanel("import")} disabled={historyViewActive}>
            <ToolbarImportIcon />
          </button>
          <button className="action-icon-button" aria-label={t("editor.export")} title={t("editor.export")} onClick={() => onTopPanel("export")}>
            <ToolbarVectorExportIcon />
          </button>
          <button className="action-icon-button" aria-label={t("editor.workspaceSettings")} title={t("editor.workspaceSettings")} onClick={() => window.dispatchEvent(new Event("layerling:open-workspace-settings"))}>
            <ToolbarSettingsIcon />
          </button>
        </div>
      </div>
      <div className="toolbar-section toolbar-actions-section" data-group="help">
        <div className="toolbar-section-label">{t("editor.group.help")}</div>
        <div className="action-buttons">
          <button className="action-icon-button" aria-label={t("palette.open")} title={t("palette.open")} aria-haspopup="dialog" data-layerling-tool="command-search" onClick={openPalette}>
            <Search className="toolbar-search-icon" aria-hidden="true" />
          </button>
          <button className="action-icon-button" aria-label={t("editor.guide")} title={t("editor.guide")} onClick={onGuide}>
            <ToolbarGuideIcon />
          </button>
          <button className="action-icon-button" aria-label={t("editor.keyboardShortcuts")} title={t("editor.keyboardShortcuts")} onClick={onShortcuts}>
            <ToolbarKeyboardIcon />
          </button>
        </div>
      </div>
          </>
        ) : (
          <div className="sketch-toolbar-ribbon" aria-label={t("sketch.toolbar")}>
            {sketchActive ? (
              <>
                <div className="toolbar-section sketch-create-section" data-group="draw">
                  <div className="toolbar-section-label">{t("sketch.group.draw")}</div>
                  <div className="toolbar-section-tools">
                    <button className={`toolbar-icon sketch-tool-icon ${sketchTool === "line" ? "active" : ""}`} type="button" aria-label={t("sketch.line")} title={t("sketch.line")} onClick={() => onSketchTool("line")}>
                      <SketchReferenceIcon name="line" />
                    </button>
                    <button className={`toolbar-icon sketch-tool-icon ${sketchTool === "bezier" ? "active" : ""}`} type="button" aria-label={t("sketch.bezier")} title={t("sketch.bezier")} onClick={() => onSketchTool("bezier")}>
                      <SketchReferenceIcon name="bezier" />
                    </button>
                    <button className={`toolbar-icon sketch-tool-icon ${sketchTool === "smooth" ? "active" : ""}`} type="button" aria-label={t("sketch.smooth")} title={t("sketch.smooth")} onClick={() => onSketchTool("smooth")}>
                      <SketchReferenceIcon name="smooth" />
                    </button>
                  </div>
                </div>
                <div className="toolbar-section toolbar-shapes-section sketch-shapes-section" data-group="shapes" ref={shapesMenuRef}>
                  <div className="toolbar-section-label">{t("sketch.group.shapes")}</div>
                  <div className="toolbar-section-tools">
                    <button
                      className={`shape-menu-trigger ${shapesOpen ? "active" : ""}`}
                      type="button"
                      aria-label={t("sketch.addShape")}
                      aria-haspopup="menu"
                      aria-expanded={shapesOpen}
                      onClick={() => {
                        setSketchCreateOpen(false);
                        setVisibilityOpen(false);
                        setShapesOpen((open) => !open);
                      }}
                    >
                      <ToolbarShapeAddIcon />
                    </button>
                  </div>
                  {shapesOpen ? (
                    <div className="shape-menu-dropdown sketch-shape-menu-dropdown" role="menu" aria-label={t("sketch.shapesMenu")}>
                      <div className="shape-menu-title">
                        {t("sketch.shapesTitle")}
                        <GuideHelpLink section="sketchDrawing" />
                      </div>
                      <div className="shape-menu-list">
                        {sketchShapeMenuItems.map(({ primitive, label, icon: Icon }) => (
                          <button
                            className="shape-menu-item sketch-primitive-source"
                            key={primitive}
                            type="button"
                            role="menuitem"
                            draggable
                            title={t("sketch.addPrimitiveHint", { shape: t(label) })}
                            onClick={() => addSketchShapeFromMenu(primitive)}
                            onDragStart={(event) => {
                              event.dataTransfer.effectAllowed = "copy";
                              event.dataTransfer.setData("application/x-layerling-sketch-primitive", primitive);
                            }}
                            onDragEnd={() => setShapesOpen(false)}
                          >
                            <Icon className="sketch-shape-menu-icon" aria-hidden="true" />
                            <span>{t(label)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="toolbar-section sketch-edit-section" data-group="select">
                  <div className="toolbar-section-label">{t("sketch.group.select")}</div>
                  <div className="toolbar-section-tools">
                    <button className={`toolbar-icon sketch-tool-icon ${sketchTool === "select" ? "active" : ""}`} type="button" aria-label={t("sketch.select")} title={t("sketch.select")} onClick={() => onSketchTool("select")}>
                      <SketchReferenceIcon name="select" />
                    </button>
                    <button
                      className={`toolbar-icon sketch-tool-icon ${sketchTool === "select" ? "" : "disabled"}`}
                      type="button"
                      aria-label={t("sketch.addImage")}
                      title={sketchTool === "select" ? t("sketch.addImageReady") : t("sketch.addImageBlocked")}
                      onClick={onSketchImage}
                      disabled={sketchTool !== "select"}
                    >
                      <SketchReferenceIcon name="image" />
                    </button>
                    <button className={`toolbar-icon sketch-tool-icon ${sketchTool === "refine" ? "active" : ""}`} type="button" aria-label={t("sketch.refine")} title={t("sketch.refine")} onClick={() => onSketchTool("refine")}>
                      <SketchReferenceIcon name="refine" />
                    </button>
                    <button
                      className={`toolbar-icon sketch-tool-icon ${canFilletSketchPoint ? "" : "disabled"} ${sketchCornerDialog === "fillet" ? "active" : ""}`}
                      type="button"
                      aria-label={t("sketch.filletCorner")}
                      title={canFilletSketchPoint ? t("sketch.filletCorner") : t("sketch.filletCornerDisabled")}
                      onClick={() => {
                        if (!canFilletSketchPoint) return;
                        onSketchCornerDialog?.(sketchCornerDialog === "fillet" ? null : "fillet");
                      }}
                      disabled={!canFilletSketchPoint}
                    >
                      <ToolbarFilletIcon />
                    </button>
                    <button
                      className={`toolbar-icon sketch-tool-icon ${canFilletSketchPoint ? "" : "disabled"} ${sketchCornerDialog === "chamfer" ? "active" : ""}`}
                      type="button"
                      aria-label={t("sketch.chamferCorner")}
                      title={canFilletSketchPoint ? t("sketch.chamferCorner") : t("sketch.chamferCornerDisabled")}
                      onClick={() => {
                        if (!canFilletSketchPoint) return;
                        onSketchCornerDialog?.(sketchCornerDialog === "chamfer" ? null : "chamfer");
                      }}
                      disabled={!canFilletSketchPoint}
                    >
                      <ToolbarChamferIcon />
                    </button>
                    <button className={`toolbar-icon sketch-tool-icon ${sketchTool === "erase" ? "active" : ""}`} type="button" aria-label={t("sketch.erase")} title={t("sketch.erase")} onClick={() => onSketchTool("erase")}>
                      <SketchReferenceIcon name="erase" />
                    </button>
                  </div>
                </div>
                <div className="toolbar-section sketch-clipboard-section" data-group="clipboard">
                  <div className="toolbar-section-label">{t("editor.group.clipboard")}</div>
                  <div className="toolbar-section-tools">{sketchClipboardTools.map(renderToolButton)}</div>
                </div>
                <div className="toolbar-section sketch-history-section" data-group="history">
                  <div className="toolbar-section-label">{t("editor.group.history")}</div>
                  <div className="toolbar-section-tools">
                    <button className={`toolbar-icon ${sketchCanUndo ? "" : "disabled"}`} type="button" aria-label={t("sketch.undo")} title={t("status.undo")} onClick={onSketchUndo} disabled={!sketchCanUndo}>
                      <ToolbarUndoIcon />
                    </button>
                    <button className={`toolbar-icon ${sketchCanRedo ? "" : "disabled"}`} type="button" aria-label={t("sketch.redo")} title={t("status.redo")} onClick={onSketchRedo} disabled={!sketchCanRedo}>
                      <ToolbarRedoIcon />
                    </button>
                  </div>
                </div>
                <div className="toolbar-spacer" />
                <div className="toolbar-section sketch-finish-section" data-group="finish">
                  <div className="toolbar-section-label">{t("sketch.group.finish")}</div>
                  <div className="toolbar-section-tools">
                    {sketchOperation === "revolve" ? null : <button
                      className={`sketch-command-button ${sketchStrokeActive ? "active" : ""}`}
                      type="button"
                      aria-pressed={Boolean(sketchStrokeActive)}
                      title={t("sketch.strokeHint")}
                      onClick={onSketchStroke}
                    >
                      <SketchReferenceIcon name="line" />
                      <span>{t("sketch.stroke")}</span>
                    </button>}
                    <button className="sketch-command-button primary" type="button" onClick={onSketchFinish}>
                      <Check />
                      <span>{sketchOperation === "revolve" ? t("sketch.finishRevolve") : t("sketch.finishSketch")}</span>
                    </button>
                    <button className="sketch-command-button cancel" type="button" onClick={onSketchCancel}>
                      <X />
                      <span>{t("sketch.cancel")}</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="toolbar-section sketch-start-section" data-group="create">
                <div className="toolbar-section-label">{t("sketch.group.create")}</div>
                <div className="toolbar-section-tools">
                  <div className="sketch-create-menu" ref={sketchCreateMenuRef}>
                    <button
                      className={`sketch-command-button primary sketch-create-menu-trigger ${sketchCreateOpen ? "active" : ""}`}
                      type="button"
                      aria-label={t("sketch.to3dOptions")}
                      aria-haspopup="menu"
                      aria-expanded={sketchCreateOpen}
                      onClick={() => setSketchCreateOpen((open) => !open)}
                    >
                      <SketchReferenceIcon name="sketchTo3d" />
                      <span>{t("sketch.to3d")}</span>
                      <ToolbarCaretDownIcon className="sketch-create-menu-chevron" />
                    </button>
                    {sketchCreateOpen ? (
                      <div className="sketch-create-dropdown" role="menu" aria-label={t("sketch.to3dMethod")}>
                        <div className="sketch-create-title">
                          {t("sketch.to3dMethod")}
                          <GuideHelpLink section="sketchToBody" />
                        </div>
                        <button type="button" role="menuitem" onClick={() => startSketch("extrude")}>
                          <strong>{t("sketch.extrude")}</strong>
                          <span>{t("sketch.extrudeHint")}</span>
                        </button>
                        <button type="button" role="menuitem" onClick={() => startSketch("revolve")}>
                          <strong>{t("sketch.revolve")}</strong>
                          <span>{t("sketch.revolveHint")}</span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <button className={`sketch-command-button ${canEditSketch ? "" : "disabled"}`} type="button" aria-label={t("sketch.editTo3d")} title={t("sketch.editTo3d")} onClick={onEditSketch} disabled={!canEditSketch}>
                    <SketchReferenceIcon name="editSketchTo3d" />
                    <span>{t("sketch.edit")}</span>
                  </button>
                </div>
              </div>
            )}
            {/* Sketch mode has its own keys; the help opens from here too. */}
            <div className="toolbar-section toolbar-actions-section" data-group="help">
              <div className="toolbar-section-label">{t("editor.group.help")}</div>
              <div className="action-buttons">
                <button className="action-icon-button" aria-label={t("palette.open")} title={t("palette.open")} aria-haspopup="dialog" data-layerling-tool="command-search" onClick={openPalette}>
                  <Search className="toolbar-search-icon" aria-hidden="true" />
                </button>
                <button className="action-icon-button" aria-label={t("editor.guide")} title={t("editor.guide")} onClick={onGuide}>
                  <ToolbarGuideIcon />
                </button>
                <button className="action-icon-button" aria-label={t("editor.keyboardShortcuts")} title={t("editor.keyboardShortcuts")} onClick={onShortcuts}>
                  <ToolbarKeyboardIcon />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="toolbar-title-row">
        {/* The brand, in the same corner as on the start page. Not a link:
            leaving the editor is not something to trigger by accident. */}
        <div className="toolbar-brand">
          <img src="/assets/layerling/layerling-logo.svg" alt="Layerling" />
          <span className="toolbar-brand-text">
            <span className="toolbar-brand-name">layerling</span>
            <span className="toolbar-brand-tagline">{t("brand.tagline")}</span>
          </span>
        </div>
        <div className="toolbar-workspace-tabs" role="tablist" aria-label={t("editor.modeLabel")}>
          <button
            className={toolbarMode === "geometry" ? "active" : ""}
            type="button"
            role="tab"
            aria-selected={toolbarMode === "geometry"}
            onClick={() => selectToolbarMode("geometry")}
          >
            {t("editor.modeGeometry")}
          </button>
          <button
            className={toolbarMode === "sketch" ? "active" : ""}
            type="button"
            role="tab"
            aria-selected={toolbarMode === "sketch"}
            onClick={() => selectToolbarMode("sketch")}
            disabled={historyViewActive}
          >
            {t("editor.modeSketch")}
          </button>
        </div>
        <div className="toolbar-project-name">
          <label ref={projectNameFieldRef} className="toolbar-project-name-field" title={t("editor.renameProject")}>
            <input
              ref={projectNameInputRef}
              aria-label={t("confirm.projectName")}
              value={projectNameDraft}
              maxLength={80}
              spellCheck={false}
              onChange={(event) => setProjectNameDraft(event.target.value)}
              onBlur={(event) => {
                if (cancelProjectNameEditRef.current) {
                  cancelProjectNameEditRef.current = false;
                  setProjectNameDraft(projectName);
                  return;
                }
                commitProjectName(event.currentTarget.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
                if (event.key === "Escape") {
                  cancelProjectNameEditRef.current = true;
                  event.currentTarget.blur();
                }
              }}
            />
            <Pencil size={13} strokeWidth={2.4} aria-hidden="true" />
          </label>
        </div>
        <div className="toolbar-title-row-actions">
          <ThemeSwitch />
          <LanguageSwitch />
        </div>
      </div>
    </div>
  );
}

function TopActionPanel({
  panel,
  projectName,
  shapeCount,
  scopeLabel,
  selectionLeavesOut,
  onSelectAll,
  onlyHoles,
  hiddenCount = 0,
  estimateShapes,
  onEstimatePrint,
  onClose,
  onExport,
  onExportLyl,
  onExportStep,
  onExportImage,
  sharedProjectsEnabled,
  lylExporting,
  stepExporting,
  onImportFiles,
  onPickFile,
  onPickProjectFile,
  onPickInsertProjectFile,
  workspaceHistoryLimit,
}: {
  panel: Exclude<TopPanel, null>;
  projectName: string;
  shapeCount: number;
  scopeLabel: "selected" | "total";
  /** Set when a selection is exported that leaves out visible bodies: how many are selected, how many are visible. */
  selectionLeavesOut?: { selected: number; total: number } | null;
  onSelectAll?: () => void;
  onlyHoles?: boolean;
  /** Ausgeblendete Teile, die der Export auslaesst - gesagt, bevor er laeuft. */
  hiddenCount?: number;
  /** Was exportiert wuerde - daraus Volumen, Gewicht und Filament. */
  estimateShapes: readonly WorkplaneShape[];
  onEstimatePrint: (shapes: readonly WorkplaneShape[]) => Promise<ExportSolidVolume>;
  onClose: () => void;
  onExport: (format: DirectExportFormat, exportName: string) => void;
  onExportLyl: (exportName: string, historyLimit: LylHistoryLimit, target?: LylExportTarget) => void;
  onExportStep: (exportName: string) => void;
  onExportImage: (exportName: string, options: ViewImageOptions) => void;
  sharedProjectsEnabled: boolean;
  lylExporting: boolean;
  stepExporting: boolean;
  onImportFiles: (files: FileList | File[]) => void;
  onPickFile: () => void;
  onPickProjectFile: () => void;
  onPickInsertProjectFile: () => void;
  workspaceHistoryLimit: LylHistoryLimit;
}) {
  const [exportFormat, setExportFormat] = useState<ExportFormat>("stl");
  const [exportName, setExportName] = useState(projectName);
  const previousProjectNameRef = useRef(projectName);
  // Starts at the history setting from the workspace settings, so a project
  // file carries what the editor keeps unless it is changed here.
  const [lylHistoryLimit, setLylHistoryLimit] = useState<LylHistoryLimit>(workspaceHistoryLimit);
  useEffect(() => setLylHistoryLimit(workspaceHistoryLimit), [workspaceHistoryLimit]);
  useEffect(() => {
    const previousProjectName = previousProjectNameRef.current;
    setExportName((current) => current === previousProjectName ? projectName : current);
    previousProjectNameRef.current = projectName;
  }, [projectName]);
  // A custom number from the settings joins the usual stops in its place.
  const lylHistoryLimits = useMemo<readonly LylHistoryLimit[]>(() => {
    const presets: number[] = [100, 50, 30];
    const numbers = typeof workspaceHistoryLimit === "number" && !presets.includes(workspaceHistoryLimit)
      ? [...presets, workspaceHistoryLimit].sort((a, b) => b - a)
      : presets;
    return ["unlimited", ...numbers];
  }, [workspaceHistoryLimit]);
  const lylHistoryLimitIndex = Math.max(0, lylHistoryLimits.indexOf(lylHistoryLimit));
  const [printMaterial, setPrintMaterial] = useState<PrintMaterial>(() => {
    try {
      return normalizePrintMaterial(window.localStorage.getItem(PRINT_MATERIAL_STORAGE_KEY));
    } catch {
      return DEFAULT_PRINT_MATERIAL;
    }
  });
  const [printVolume, setPrintVolume] = useState<ExportSolidVolume | null>(null);
  const [imageOptions, setImageOptions] = useState<ViewImageOptions>({ plate: true, transparent: false });
  const showPrintEstimate = panel === "export" && exportFormat !== "svg" && exportFormat !== "png" && exportFormat !== "lyl" && shapeCount > 0;
  // A picture shows the view as it is, not the selection, so the notes about what goes along do not apply.
  const exportsBodies = exportFormat !== "lyl" && exportFormat !== "png";
  useEffect(() => {
    if (!showPrintEstimate) return;
    let cancelled = false;
    setPrintVolume(null);
    // Kurz warten: beim Tippen oder Ziehen im Hintergrund nicht jedes Mal neu verschmelzen.
    const timer = window.setTimeout(() => {
      onEstimatePrint(estimateShapes)
        .then((result) => { if (!cancelled) setPrintVolume(result); })
        .catch(() => { if (!cancelled) setPrintVolume(null); });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [showPrintEstimate, estimateShapes, onEstimatePrint]);
  const choosePrintMaterial = (value: string) => {
    const material = normalizePrintMaterial(value);
    setPrintMaterial(material);
    try {
      window.localStorage.setItem(PRINT_MATERIAL_STORAGE_KEY, material);
    } catch {
      // Ohne Speicher gilt die Wahl nur bis zum Schliessen.
    }
  };
  const estimate = printVolume ? printEstimate(printVolume.volumeMm3, printMaterial) : null;
  const lylHistoryStop = (index: number) => ({ "--stop": index / (lylHistoryLimits.length - 1) }) as CSSProperties;
  useLanguage();
  const title = panel === "export" ? t("panel.export") : t("panel.import");

  const exportDetails: Record<ExportFormat, { label: string; description: string; note: string }> = {
    stl: {
      label: "STL",
      description: t("export.stl.description"),
      note: t("export.stl.note"),
    },
    "3mf": {
      label: "3MF",
      description: t("export.3mf.description"),
      note: t("export.3mf.note"),
    },
    obj: {
      label: "OBJ",
      description: t("export.obj.description"),
      note: t("export.obj.note"),
    },
    step: {
      label: "STEP",
      description: t("export.step.description"),
      note: t("export.step.note"),
    },
    svg: {
      label: "SVG",
      description: t("export.svg.description"),
      note: t("export.svg.note"),
    },
    png: {
      label: "PNG",
      description: t("export.png.description"),
      note: t("export.png.note"),
    },
    lyl: {
      label: "LYL",
      description: t("export.lyl.description"),
      note: t("export.lyl.note"),
    },
  };
  const selectedExport = exportDetails[exportFormat];
  const runSelectedExport = () => {
    if (exportFormat === "step") onExportStep(exportName);
    else if (exportFormat === "png") onExportImage(exportName, imageOptions);
    else if (exportFormat === "lyl") onExportLyl(exportName, lylHistoryLimit);
    else onExport(exportFormat, exportName);
  };

  return (
    <div
      className={`top-action-panel ${panel === "export" ? "export-action-panel" : panel === "import" ? "import-action-panel" : ""}`}
      role="dialog"
      aria-label={title}
    >
      <header>
        <div className="top-action-heading">
          <strong>{title}</strong>
        </div>
        <div className="panel-header-actions">
          <GuideHelpLink section={panel === "import" ? "importing" : "exporting"} />
          <button aria-label={t("panel.close", { title })} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
      </header>
      {panel === "import" ? (
        <div className="top-action-body">
          <button className="open-lyl-project-button" type="button" onClick={onPickProjectFile}>
            <span className="open-lyl-project-icon"><FolderOpen size={18} /></span>
            <span>
              <strong>{t("import.openProject")}</strong>
              <small>{t("import.openProjectHint")}</small>
            </span>
          </button>
          <button className="open-lyl-project-button" type="button" onClick={onPickInsertProjectFile}>
            <span className="open-lyl-project-icon"><FilePlus2 size={18} /></span>
            <span>
              <strong>{t("import.insertProject")}</strong>
              <small>{t("import.insertProjectHint")}</small>
            </span>
          </button>
          <div className="import-kind-divider"><span>{t("import.divider")}</span></div>
          <button
            className="import-drop-zone"
            onClick={onPickFile}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (event.dataTransfer.files.length > 0) {
                onImportFiles(event.dataTransfer.files);
              }
            }}
          >
            <ToolbarImportIcon />
            <strong>{t("import.dropZone")}</strong>
            <span>{t("import.dropZoneHint")}</span>
          </button>
        </div>
      ) : null}
      {panel === "export" ? (
        <div className="export-dialog-body">
          <section className="export-setting-section export-file-section">
            <label htmlFor="export-file-name">{t("export.fileName")}</label>
            <div className="export-file-input-wrap">
              <input
                id="export-file-name"
                className="export-file-input"
                value={exportName}
                maxLength={120}
                spellCheck={false}
                onChange={(event) => setExportName(event.target.value)}
                onFocus={(event) => event.currentTarget.select()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (shapeCount > 0 || !exportsBodies) && !stepExporting && !lylExporting) runSelectedExport();
                }}
              />
              <span>.{exportFormat}</span>
            </div>
          </section>

          <section className="export-setting-section">
            <div className="export-section-heading">
              <div>
                <strong>{t("export.format")}</strong>
              </div>
              <span className="export-scope-badge">{exportFormat === "lyl"
                  ? t("export.fullProject")
                  : exportFormat === "png"
                  ? t("export.png.scope")
                  : t(scopeLabel === "selected" ? "export.scopeSelected" : "export.scopeTotal", { count: shapeCount })}</span>
            </div>
            <div className="export-format-slider" data-format={exportFormat} role="radiogroup" aria-label={t("export.formatLabel")}>
              {(["stl", "3mf", "obj", "step", "svg", "png", "lyl"] as const).map((format) => (
                <button
                  key={format}
                  type="button"
                  role="radio"
                  aria-checked={exportFormat === format}
                  aria-label={`${exportDetails[format].label}: ${exportDetails[format].description}`}
                  onClick={() => setExportFormat(format)}
                >
                  {exportDetails[format].label}
                </button>
              ))}
            </div>
          </section>

          {exportsBodies && selectionLeavesOut ? (
            <div className="export-holes-only-warning export-selection-note" role="status">
              <Info size={16} aria-hidden="true" />
              <span>
                {selectionLeavesOut.selected === 1
                  ? t("export.selectionOnlyOne", { total: selectionLeavesOut.total })
                  : t("export.selectionOnlyMany", { count: selectionLeavesOut.selected, total: selectionLeavesOut.total })}
              </span>
              {onSelectAll ? (
                <button type="button" className="export-select-all-button" onClick={onSelectAll}>
                  {t("export.selectAll")}
                </button>
              ) : null}
            </div>
          ) : null}

          {exportsBodies && hiddenCount > 0 ? (
            <div className="export-holes-only-warning export-hidden-note" role="status">
              <EyeOff size={16} aria-hidden="true" />
              <span>{hiddenCount === 1 ? t("export.hiddenOne") : t("export.hiddenMany", { count: hiddenCount })}</span>
            </div>
          ) : null}

          {exportsBodies && onlyHoles ? (
            <div className="export-holes-only-warning" role="status">
              <Info size={16} aria-hidden="true" />
              <span>{t("export.holesOnlyWarning")}</span>
            </div>
          ) : null}

          {showPrintEstimate ? (
            <section className="export-setting-section print-estimate-section" aria-live="polite">
              <div className="export-section-heading">
                <div>
                  <strong>{t("export.estimateTitle")}</strong>
                  <span>{t("export.estimateHint")}</span>
                </div>
                <select
                  id="export-print-material"
                  className="print-estimate-material"
                  value={printMaterial}
                  aria-label={t("export.estimateMaterial")}
                  onChange={(event) => choosePrintMaterial(event.currentTarget.value)}
                >
                  {PRINT_MATERIALS.map((material) => (
                    <option key={material} value={material}>{t(`export.material.${material}` as MessageKey)}</option>
                  ))}
                </select>
              </div>
              {estimate ? (
                <dl className="print-estimate-values">
                  <div>
                    <dt>{t("export.estimateVolume")}</dt>
                    <dd>{formatEstimateNumber(estimate.volumeCm3, estimate.volumeCm3 < 10 ? 2 : 1)} cm³</dd>
                  </div>
                  <div>
                    <dt>{t("export.estimateWeight")}</dt>
                    <dd>{formatEstimateNumber(estimate.grams, estimate.grams < 10 ? 1 : 0)} g</dd>
                  </div>
                  <div>
                    <dt>{t("export.estimateFilament")}</dt>
                    <dd>{formatEstimateNumber(estimate.filamentMeters, estimate.filamentMeters < 10 ? 2 : 1)} m</dd>
                  </div>
                </dl>
              ) : (
                <span className="print-estimate-busy">{t("export.estimateBusy")}</span>
              )}
              {printVolume && printVolume.unionFailed > 0 ? (
                <span className="print-estimate-note">{t("export.estimateOverlap")}</span>
              ) : null}
            </section>
          ) : null}

          {exportFormat === "png" ? (
            <section className="export-setting-section export-image-section">
              <label className="export-image-option" htmlFor="export-image-plate">
                <input id="export-image-plate" type="checkbox" checked={imageOptions.plate} onChange={(event) => { const plate = event.currentTarget.checked; setImageOptions((current) => ({ ...current, plate })); }} />
                <span>{t("export.png.plate")}</span>
              </label>
              <label className="export-image-option" htmlFor="export-image-transparent">
                <input id="export-image-transparent" type="checkbox" checked={imageOptions.transparent} onChange={(event) => { const transparent = event.currentTarget.checked; setImageOptions((current) => ({ ...current, transparent })); }} />
                <span>{t("export.png.transparent")}</span>
              </label>
            </section>
          ) : null}

          {exportFormat === "lyl" ? (
            <section className="export-setting-section lyl-history-section">
              <div className="export-section-heading">
                <div>
                  <strong>{t("export.historyTitle")}</strong>
                  <span>{t("export.historyHint")}</span>
                </div>
              </div>
              <div className="lyl-history-range-control" data-limit={String(lylHistoryLimit)} style={lylHistoryStop(lylHistoryLimitIndex)}>
                <input
                  className="lyl-history-range"
                  type="range"
                  min={0}
                  max={lylHistoryLimits.length - 1}
                  step={1}
                  value={lylHistoryLimitIndex}
                  aria-label={t("export.historyLabel")}
                  aria-valuetext={lylHistoryLimit === "unlimited" ? t("export.unlimited") : t("export.actionCount", { count: lylHistoryLimit })}
                  onChange={(event) => setLylHistoryLimit(lylHistoryLimits[Number(event.currentTarget.value)] ?? "unlimited")}
                />
              </div>
              <div className="lyl-history-range-labels" aria-hidden="true">
                {lylHistoryLimits.map((limit, index) => (
                  <span key={limit} className={lylHistoryLimit === limit ? "active" : undefined} style={lylHistoryStop(index)}>
                    {limit === "unlimited" ? t("export.unlimited") : limit}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          <div className="export-format-summary">
            <div>
              <strong>{selectedExport.label}</strong>
              <span>{selectedExport.description}</span>
            </div>
            <p>{selectedExport.note}</p>
          </div>

          <footer className="export-dialog-footer">
            <div>
              {exportFormat === "lyl" && sharedProjectsEnabled ? (
                <button
                  className="export-shared-button"
                  type="button"
                  onClick={() => onExportLyl(exportName, lylHistoryLimit, "shared")}
                  disabled={lylExporting || stepExporting}
                >
                  <CloudUpload />
                  <span>{t("export.saveToShared")}</span>
                </button>
              ) : null}
              <button className="export-primary-button" onClick={runSelectedExport} disabled={(shapeCount === 0 && exportsBodies) || stepExporting || lylExporting}>
                <Download />
                {exportFormat === "lyl" ? (lylExporting ? t("export.savingProject") : t("export.saveProject")) : null}
                <span hidden={exportFormat === "lyl"}>
                {stepExporting && exportFormat === "step"
                  ? t("export.buildingStep")
                  : t("export.run", { format: selectedExport.label })}
                </span>
              </button>
            </div>
          </footer>
        </div>
      ) : null}
    </div>
  );
}
